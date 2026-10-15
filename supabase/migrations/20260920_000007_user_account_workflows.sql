-- User-facing history, report and account-deletion support.

create policy "own ratings read" on public.ratings
for select using (user_id=auth.uid());

create policy "own reports read" on public.reports
for select using (reporter_id=auth.uid());

create policy "past customer counselor profile read" on public.counselor_profiles
for select using (
  exists (
    select 1 from public.consultations c
    where c.counselor_id=counselor_profiles.user_id
      and c.user_id=auth.uid()
  )
);

create table public.account_deletion_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','completed','canceled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  note text
);

alter table public.account_deletion_requests enable row level security;

create policy "own deletion request read" on public.account_deletion_requests
for select using (user_id=auth.uid());

create policy "own deletion request create" on public.account_deletion_requests
for insert with check (user_id=auth.uid());

create policy "admin deletion requests read" on public.account_deletion_requests
for select using (public.is_admin());

create policy "admin deletion requests update" on public.account_deletion_requests
for update using (public.is_admin());

create or replace function public.request_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.account_deletion_requests;
begin
  insert into public.account_deletion_requests(user_id,status,requested_at)
  values(auth.uid(),'pending',now())
  on conflict(user_id) do update
    set status='pending',requested_at=now(),completed_at=null
  returning * into v_row;

  update public.notification_preferences
  set enabled=false,updated_at=now()
  where user_id=auth.uid();

  delete from public.device_tokens where user_id=auth.uid();

  update public.counselor_availability
  set is_accepting=false,updated_at=now()
  where counselor_id=auth.uid();

  return v_row;
end;
$$;
