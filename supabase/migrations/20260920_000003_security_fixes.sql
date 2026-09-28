-- Security and policy corrections.

-- Clients must not be able to escalate their own roles or counselor review state.
revoke update on public.profiles from authenticated;
grant update (nickname, age_band, avatar_path, updated_at) on public.profiles to authenticated;

revoke update on public.counselor_profiles from authenticated;
grant update (display_name, gender, specialty, bio, avatar_path, updated_at) on public.counselor_profiles to authenticated;

-- All chat writes go through send-message so counselor moderation cannot be bypassed.
drop policy if exists "messages participants insert" on public.messages;
revoke insert on public.messages from authenticated;

-- Ratings must belong to the signed-in customer's consultation.
drop policy if exists "own ratings insert" on public.ratings;
create policy "own ratings insert" on public.ratings
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.consultations c
    where c.id = consultation_id
      and c.user_id = auth.uid()
      and c.counselor_id = counselor_id
      and c.status = 'ended'
  )
);

-- Reports must reference a consultation the reporter participated in.
drop policy if exists "own reports insert" on public.reports;
create policy "own reports insert" on public.reports
for insert with check (
  reporter_id = auth.uid()
  and (
    consultation_id is null
    or exists (
      select 1 from public.consultations c
      where c.id = consultation_id
        and (c.user_id = auth.uid() or c.counselor_id = auth.uid())
        and (counselor_id is null or c.counselor_id = reports.counselor_id)
    )
  )
);

alter table public.payments add column if not exists applied_at timestamptz;

-- Count every active confirmed strike, regardless of whether it came from
-- automated detection or an admin-confirmed user report.
create or replace function public.record_counselor_violation(
  p_counselor_id uuid,
  p_consultation_id uuid,
  p_category text,
  p_attempted_message text,
  p_context jsonb default '[]'::jsonb,
  p_detector text default 'server-rule-v2'
) returns table(strike_count integer, suspended boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)::integer into v_count
  from public.moderation_events
  where counselor_id = p_counselor_id
    and status = 'active'
    and strike_number > 0;

  v_count := least(v_count + 1, 2);

  insert into public.moderation_events(
    counselor_id, consultation_id, source, detector, category,
    attempted_message, context, strike_number, action
  ) values (
    p_counselor_id, p_consultation_id, 'automated', p_detector, p_category,
    p_attempted_message, coalesce(p_context, '[]'::jsonb), v_count,
    case when v_count >= 2 then 'counselor_suspended' else 'message_blocked_warning' end
  );

  if v_count >= 2 then
    update public.counselor_profiles
    set is_suspended = true,
        suspended_at = now(),
        suspension_reason = 'Repeated off-platform solicitation',
        updated_at = now()
    where user_id = p_counselor_id;

    update public.counselor_availability
    set is_accepting = false, updated_at = now()
    where counselor_id = p_counselor_id;
  end if;

  return query select v_count, (v_count >= 2);
end;
$$;

-- Idempotent extension application for retried Stripe webhooks.
create or replace function public.apply_paid_extension(
  p_consultation_id uuid,
  p_payment_intent_id text
) returns table(new_ends_at timestamptz)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payment public.payments%rowtype;
  v_ends timestamptz;
begin
  select * into v_payment
  from public.payments
  where provider_payment_intent_id=p_payment_intent_id
  for update;

  if not found then raise exception 'Payment not found'; end if;
  if v_payment.consultation_id <> p_consultation_id then raise exception 'Payment mismatch'; end if;
  if v_payment.kind <> 'extension' then raise exception 'Not an extension payment'; end if;
  if v_payment.status <> 'succeeded' then raise exception 'Payment not settled'; end if;

  select ends_at into v_ends
  from public.consultations
  where id=p_consultation_id
  for update;

  if v_ends is null then raise exception 'Consultation has not started'; end if;

  if v_payment.applied_at is null then
    update public.consultations
    set ends_at=greatest(ends_at,now()) + interval '15 minutes',
        duration_seconds=duration_seconds+900
    where id=p_consultation_id
    returning ends_at into v_ends;

    update public.payments
    set applied_at=now(), updated_at=now()
    where id=v_payment.id;
  end if;

  return query select v_ends;
end;
$$;
