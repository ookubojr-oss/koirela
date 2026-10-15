-- Final security/runtime hardening after source audit.

-- Make outer-row references explicit in RLS policies.
drop policy if exists "own ratings insert" on public.ratings;
create policy "own ratings insert" on public.ratings
for insert with check (
  public.is_current_user_active()
  and ratings.user_id=auth.uid()
  and exists(
    select 1 from public.consultations c
    where c.id=ratings.consultation_id
      and c.user_id=auth.uid()
      and c.counselor_id=ratings.counselor_id
      and c.status='ended'
  )
);

drop policy if exists "own reports insert" on public.reports;
create policy "own reports insert" on public.reports
for insert with check (
  public.is_current_user_active()
  and reports.reporter_id=auth.uid()
  and (
    reports.consultation_id is null
    or exists(
      select 1 from public.consultations c
      where c.id=reports.consultation_id
        and (c.user_id=auth.uid() or c.counselor_id=auth.uid())
        and (reports.counselor_id is null or c.counselor_id=reports.counselor_id)
    )
  )
);

-- Participant lookup used by recovery logic.
create index if not exists consultations_active_user_idx
on public.consultations(user_id,ends_at)
where status in ('waiting','active');

create index if not exists consultations_active_counselor_idx
on public.consultations(counselor_id,ends_at)
where status in ('waiting','active');
