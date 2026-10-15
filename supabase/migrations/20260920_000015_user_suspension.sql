-- User account suspension and active-user mutation guards.

alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create or replace function public.is_current_user_active()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (select not is_suspended from public.profiles where id=auth.uid()),
    false
  );
$$;

drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles
for update using (id=auth.uid() and public.is_current_user_active())
with check (id=auth.uid() and public.is_current_user_active());

drop policy if exists "own ratings insert" on public.ratings;
create policy "own ratings insert" on public.ratings
for insert with check (
  public.is_current_user_active()
  and user_id=auth.uid()
  and exists(
    select 1 from public.consultations c
    where c.id=consultation_id
      and c.user_id=auth.uid()
      and c.counselor_id=counselor_id
      and c.status='ended'
  )
);

drop policy if exists "own ratings update" on public.ratings;
create policy "own ratings update" on public.ratings
for update using (user_id=auth.uid() and public.is_current_user_active())
with check (user_id=auth.uid() and public.is_current_user_active());

drop policy if exists "own blocks manage" on public.blocks;
create policy "own blocks manage" on public.blocks
for all using (blocker_id=auth.uid() and public.is_current_user_active())
with check (blocker_id=auth.uid() and public.is_current_user_active());

drop policy if exists "own reports insert" on public.reports;
create policy "own reports insert" on public.reports
for insert with check (
  public.is_current_user_active()
  and reporter_id=auth.uid()
  and (
    consultation_id is null
    or exists(
      select 1 from public.consultations c
      where c.id=consultation_id
        and (c.user_id=auth.uid() or c.counselor_id=auth.uid())
        and (counselor_id is null or c.counselor_id=reports.counselor_id)
    )
  )
);

drop policy if exists "own notification prefs" on public.notification_preferences;
create policy "own notification prefs" on public.notification_preferences
for all using (user_id=auth.uid())
with check (user_id=auth.uid() and public.is_current_user_active());

drop policy if exists "own device tokens" on public.device_tokens;
create policy "own device tokens" on public.device_tokens
for all using (user_id=auth.uid())
with check (user_id=auth.uid() and public.is_current_user_active());

drop policy if exists "own favorites insert" on public.favorites;
create policy "own favorites insert" on public.favorites
for insert with check (user_id=auth.uid() and public.is_current_user_active());

drop policy if exists "own favorites delete" on public.favorites;
create policy "own favorites delete" on public.favorites
for delete using (user_id=auth.uid() and public.is_current_user_active());

drop policy if exists "availability counselor update" on public.counselor_availability;
create policy "availability counselor update" on public.counselor_availability
for update using (counselor_id=auth.uid() and public.is_current_user_active())
with check (counselor_id=auth.uid() and public.is_current_user_active());

create policy "admin profiles update" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());
