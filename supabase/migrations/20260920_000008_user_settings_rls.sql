-- Small RLS additions for settings/history UX.

create policy "own ratings update" on public.ratings
for update using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy "blocked counselor profile read" on public.counselor_profiles
for select using (
  exists (
    select 1 from public.blocks b
    where b.blocker_id=auth.uid()
      and b.blocked_id=counselor_profiles.user_id
  )
);
