-- Production hardening: auth profile bootstrap, realtime, storage, admin workflows, extensions.

alter table public.payments
  add column if not exists kind text not null default 'initial'
  check (kind in ('initial','extension','refund'));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id, nickname, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname',''), nullif(new.raw_user_meta_data->>'name',''), 'ユーザー'),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Realtime tables.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.consultations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.counselor_availability;
exception when duplicate_object then null;
end $$;

-- Storage buckets. Avatar images are public; verification documents remain private.
insert into storage.buckets(id, name, public)
values ('avatars','avatars',true)
on conflict (id) do nothing;

insert into storage.buckets(id, name, public)
values ('counselor-verification','counselor-verification',false)
on conflict (id) do nothing;

create policy "avatar upload own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id='avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "avatar update own folder"
on storage.objects for update
to authenticated
using (
  bucket_id='avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "avatar delete own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id='avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "verification upload own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id='counselor-verification'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "verification read own folder"
on storage.objects for select
to authenticated
using (
  bucket_id='counselor-verification'
  and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.is_admin()
  )
);

-- Admin policies for review workflows.
create policy "admin profiles read" on public.profiles
for select using (public.is_admin());

create policy "admin counselors update" on public.counselor_profiles
for update using (public.is_admin());

create policy "admin reports update" on public.reports
for update using (public.is_admin());

create policy "admin moderation update" on public.moderation_events
for update using (public.is_admin());

create policy "admin audit insert" on public.admin_audit_logs
for insert with check (public.is_admin());

create policy "admin identity verification read" on public.identity_verifications
for select using (public.is_admin());

create policy "admin identity verification update" on public.identity_verifications
for update using (public.is_admin());

-- Atomic paid extension. Only server/service should execute directly.
create or replace function public.apply_paid_extension(
  p_consultation_id uuid,
  p_payment_intent_id text
) returns table(new_ends_at timestamptz)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_ends timestamptz;
begin
  select ends_at into v_ends
  from public.consultations
  where id=p_consultation_id
  for update;

  if v_ends is null then
    raise exception 'Consultation has not started';
  end if;

  if exists (
    select 1 from public.payments
    where provider_payment_intent_id=p_payment_intent_id
      and status='succeeded'
  ) then
    update public.consultations
    set ends_at=greatest(ends_at, now()) + interval '15 minutes',
        duration_seconds=duration_seconds+900
    where id=p_consultation_id
    returning ends_at into v_ends;
  end if;

  return query select v_ends;
end;
$$;

-- Admin confirms a user report. Only then does it count toward suspension.
create or replace function public.admin_confirm_report(p_report_id uuid)
returns table(strike_count integer, suspended boolean)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_report public.reports%rowtype;
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;

  select * into v_report from public.reports where id=p_report_id for update;
  if not found then raise exception 'Report not found'; end if;
  if v_report.status='confirmed' then raise exception 'Already confirmed'; end if;
  if v_report.counselor_id is null then raise exception 'No counselor target'; end if;

  select count(*)::integer into v_count
  from public.moderation_events
  where counselor_id=v_report.counselor_id
    and status='active'
    and strike_number>0;

  v_count:=least(v_count+1,2);

  insert into public.moderation_events(
    counselor_id, consultation_id, source, category, context,
    strike_number, action, reviewed_at, reviewed_by
  ) values (
    v_report.counselor_id, v_report.consultation_id, 'user_report',
    v_report.reason, v_report.context, v_count,
    case when v_count>=2 then 'counselor_suspended' else 'warning_after_admin_confirmation' end,
    now(), auth.uid()
  );

  update public.reports
  set status='confirmed', reviewed_at=now(), reviewed_by=auth.uid()
  where id=p_report_id;

  if v_count>=2 then
    update public.counselor_profiles
    set is_suspended=true, suspended_at=now(),
        suspension_reason='Confirmed repeated policy violations', updated_at=now()
    where user_id=v_report.counselor_id;

    update public.counselor_availability
    set is_accepting=false, updated_at=now()
    where counselor_id=v_report.counselor_id;
  end if;

  insert into public.admin_audit_logs(admin_id,action,target_type,target_id,metadata)
  values(auth.uid(),'confirm_report','report',p_report_id::text,jsonb_build_object('strike',v_count));

  return query select v_count,(v_count>=2);
end;
$$;

create or replace function public.admin_overturn_moderation(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_event public.moderation_events%rowtype;
  v_remaining integer;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;

  select * into v_event from public.moderation_events where id=p_event_id for update;
  if not found then raise exception 'Event not found'; end if;

  update public.moderation_events
  set status='overturned', reviewed_at=now(), reviewed_by=auth.uid()
  where id=p_event_id;

  select count(*)::integer into v_remaining
  from public.moderation_events
  where counselor_id=v_event.counselor_id
    and status='active'
    and strike_number>0;

  if v_remaining<2 then
    update public.counselor_profiles
    set is_suspended=false, suspended_at=null, suspension_reason=null, updated_at=now()
    where user_id=v_event.counselor_id;
  end if;

  insert into public.admin_audit_logs(admin_id,action,target_type,target_id)
  values(auth.uid(),'overturn_moderation','moderation_event',p_event_id::text);
end;
$$;

create or replace function public.admin_restore_counselor(p_counselor_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;

  update public.counselor_profiles
  set is_suspended=false, suspended_at=null, suspension_reason=null, updated_at=now()
  where user_id=p_counselor_id;

  insert into public.admin_audit_logs(admin_id,action,target_type,target_id)
  values(auth.uid(),'restore_counselor','counselor',p_counselor_id::text);
end;
$$;
