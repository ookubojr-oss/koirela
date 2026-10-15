alter table public.profiles enable row level security;
alter table public.counselor_profiles enable row level security;
alter table public.counselor_verifications enable row level security;
alter table public.consultations enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_events enable row level security;
alter table public.admin_audit enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=uid and p.role='admin');
$$;

create or replace function public.is_consultation_participant(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.consultations c
    where c.id=cid and (c.user_id=uid or c.counselor_id=uid)
  );
$$;

create policy profiles_read_self on public.profiles
for select using (id=auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
for update using (id=auth.uid()) with check (id=auth.uid());

create policy counselor_public_read on public.counselor_profiles
for select using (
  (verification_status='approved' and is_discoverable and suspended_at is null)
  or user_id=auth.uid()
  or public.is_admin()
);

create policy counselor_insert_self on public.counselor_profiles
for insert with check (user_id=auth.uid());

create policy counselor_update_self on public.counselor_profiles
for update using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy counselor_admin_all on public.counselor_profiles
for all using (public.is_admin()) with check (public.is_admin());

create policy verification_self_read on public.counselor_verifications
for select using (counselor_id=auth.uid() or public.is_admin());

create policy verification_self_insert on public.counselor_verifications
for insert with check (counselor_id=auth.uid());

create policy verification_admin_all on public.counselor_verifications
for all using (public.is_admin()) with check (public.is_admin());

create policy consultations_participant_read on public.consultations
for select using (user_id=auth.uid() or counselor_id=auth.uid() or public.is_admin());

create policy messages_participant_read on public.messages
for select using (public.is_consultation_participant(consultation_id) or public.is_admin());

create policy messages_participant_insert on public.messages
for insert with check (
  sender_id=auth.uid()
  and public.is_consultation_participant(consultation_id)
  and exists(
    select 1 from public.consultations c
    where c.id=consultation_id
      and c.status='active'
      and c.starts_at is not null
      and c.ends_at is not null
      and now() >= c.starts_at
      and now() < c.ends_at
  )
);

create policy payments_user_read on public.payments
for select using (user_id=auth.uid() or public.is_admin());

create policy ratings_participant_read on public.ratings
for select using (user_id=auth.uid() or counselor_id=auth.uid() or public.is_admin());

create policy ratings_user_insert on public.ratings
for insert with check (
  user_id=auth.uid()
  and exists(
    select 1 from public.consultations c
    where c.id=consultation_id
      and c.user_id=auth.uid()
      and c.counselor_id=ratings.counselor_id
      and c.status='completed'
  )
);

create policy reports_reporter_insert on public.reports
for insert with check (reporter_id=auth.uid());

create policy reports_reporter_read on public.reports
for select using (reporter_id=auth.uid() or public.is_admin());

create policy reports_admin_update on public.reports
for update using (public.is_admin()) with check (public.is_admin());

create policy moderation_admin_only on public.moderation_events
for all using (public.is_admin()) with check (public.is_admin());

create policy audit_admin_only on public.admin_audit
for all using (public.is_admin()) with check (public.is_admin());

create policy notification_self_all on public.notification_preferences
for all using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy push_tokens_self_all on public.push_tokens
for all using (user_id=auth.uid()) with check (user_id=auth.uid());

grant select on public.counselor_directory to anon, authenticated;
grant usage on schema public to anon, authenticated;
