-- Keep paid chat as a live-only person-to-person service for client participants.
-- Message data may still be retained server-side for safety, moderation and support,
-- but authenticated participants can only read it while the consultation is live.

drop policy if exists "messages participants read" on public.messages;

create policy "messages participants read"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.consultations c
    where c.id = messages.consultation_id
      and c.status = 'active'
      and c.ends_at > now()
      and (
        c.user_id = (select auth.uid())
        or c.counselor_id = (select auth.uid())
      )
  )
);
