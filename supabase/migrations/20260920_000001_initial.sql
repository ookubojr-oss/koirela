-- KoiRela initial production schema
create extension if not exists pgcrypto;

create type public.app_role as enum ('user','counselor','admin');
create type public.consultation_status as enum ('awaiting_payment','waiting','active','ended','canceled','refunded');
create type public.message_kind as enum ('text','system');
create type public.report_status as enum ('open','reviewed','dismissed','confirmed');
create type public.moderation_source as enum ('automated','user_report','admin');
create type public.moderation_status as enum ('active','overturned');
create type public.verification_status as enum ('not_submitted','pending','approved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  nickname text not null check (char_length(nickname) between 1 and 40),
  age_band text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counselor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  counselor_type text not null check (counselor_type in ('experience','qualified')),
  gender text check (gender is null or gender in ('female','male','other')),
  specialty text,
  bio text,
  avatar_path text,
  verification_status public.verification_status not null default 'not_submitted',
  qualification_label text,
  is_suspended boolean not null default false,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counselor_availability (
  counselor_id uuid primary key references public.counselor_profiles(user_id) on delete cascade,
  is_accepting boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.identity_verifications (
  counselor_id uuid primary key references public.counselor_profiles(user_id) on delete cascade,
  provider text,
  provider_reference text,
  identity_fingerprint_hash text,
  status public.verification_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  counselor_id uuid not null references public.counselor_profiles(user_id),
  status public.consultation_status not null default 'awaiting_payment',
  price_jpy integer not null default 100 check (price_jpy > 0),
  duration_seconds integer not null default 900 check (duration_seconds > 0),
  started_at timestamptz,
  ends_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id <> counselor_id)
);
create index consultations_user_idx on public.consultations(user_id, created_at desc);
create index consultations_counselor_idx on public.consultations(counselor_id, created_at desc);

create table public.messages (
  id bigint generated always as identity primary key,
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  kind public.message_kind not null default 'text',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_consultation_idx on public.messages(consultation_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  payer_id uuid not null references public.profiles(id),
  provider text not null default 'stripe',
  provider_payment_intent_id text unique,
  amount_jpy integer not null check (amount_jpy > 0),
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ratings (
  consultation_id uuid primary key references public.consultations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  counselor_id uuid not null references public.counselor_profiles(user_id),
  stars integer not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultations(id) on delete set null,
  reporter_id uuid not null references public.profiles(id),
  counselor_id uuid references public.counselor_profiles(user_id),
  reason text not null,
  context jsonb not null default '[]'::jsonb,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselor_profiles(user_id),
  consultation_id uuid references public.consultations(id) on delete set null,
  source public.moderation_source not null,
  detector text,
  category text not null,
  attempted_message text,
  context jsonb not null default '[]'::jsonb,
  strike_number integer not null default 0 check (strike_number between 0 and 2),
  action text not null,
  status public.moderation_status not null default 'active',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index moderation_counselor_idx on public.moderation_events(counselor_id, created_at desc);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  one_minute_warning boolean not null default true,
  counselor_online boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.record_counselor_violation(
  p_counselor_id uuid,
  p_consultation_id uuid,
  p_category text,
  p_attempted_message text,
  p_context jsonb default '[]'::jsonb,
  p_detector text default 'server-rule-v1'
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
    and source = 'automated'
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

alter table public.profiles enable row level security;
alter table public.counselor_profiles enable row level security;
alter table public.counselor_availability enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.consultations enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_events enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.device_tokens enable row level security;

create policy "profile self read" on public.profiles for select using (id = auth.uid());
create policy "profile self update" on public.profiles for update using (id = auth.uid());

create policy "public approved counselors read" on public.counselor_profiles
for select using (verification_status = 'approved' and is_suspended = false);
create policy "counselor self read" on public.counselor_profiles
for select using (user_id = auth.uid());
create policy "counselor self update" on public.counselor_profiles
for update using (user_id = auth.uid());

create policy "availability public read" on public.counselor_availability for select using (true);
create policy "availability counselor update" on public.counselor_availability for update using (counselor_id = auth.uid());

create policy "consultation participants read" on public.consultations
for select using (user_id = auth.uid() or counselor_id = auth.uid());

create policy "messages participants read" on public.messages
for select using (
  exists (
    select 1 from public.consultations c
    where c.id = consultation_id
      and (c.user_id = auth.uid() or c.counselor_id = auth.uid())
  )
);
create policy "messages participants insert" on public.messages
for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.consultations c
    where c.id = consultation_id
      and c.status = 'active'
      and c.ends_at > now()
      and (c.user_id = auth.uid() or c.counselor_id = auth.uid())
  )
);

create policy "own payments read" on public.payments for select using (payer_id = auth.uid());
create policy "own ratings insert" on public.ratings for insert with check (user_id = auth.uid());
create policy "own blocks manage" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "own reports insert" on public.reports for insert with check (reporter_id = auth.uid());
create policy "own notification prefs" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own device tokens" on public.device_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

create policy "admin moderation read" on public.moderation_events for select using (public.is_admin());
create policy "admin reports read" on public.reports for select using (public.is_admin());
create policy "admin audit read" on public.admin_audit_logs for select using (public.is_admin());
