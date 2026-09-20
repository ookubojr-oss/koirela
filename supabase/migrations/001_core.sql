create extension if not exists pgcrypto;

create type public.user_role as enum ('user','counselor','admin');
create type public.counselor_track as enum ('exp','pro');
create type public.gender_option as enum ('female','male','other','undisclosed');
create type public.verification_status as enum ('draft','pending','approved','rejected','suspended');
create type public.consultation_status as enum ('pending_payment','waiting','active','completed','cancelled','refunded');
create type public.payment_status as enum ('pending','authorized','paid','failed','refunded','held');
create type public.report_status as enum ('open','reviewed','confirmed','dismissed');
create type public.moderation_action as enum ('blocked','warning','suspended','overturned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  nickname text not null default '',
  age_band text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counselor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  track public.counselor_track not null default 'exp',
  gender public.gender_option not null default 'undisclosed',
  specialties text[] not null default '{}',
  bio text not null default '',
  avatar_path text,
  verification_status public.verification_status not null default 'draft',
  qualification_label text,
  is_accepting boolean not null default false,
  is_discoverable boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  violation_count integer not null default 0 check (violation_count between 0 and 2),
  suspended_at timestamptz,
  payout_hold boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counselor_verifications (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselor_profiles(user_id) on delete cascade,
  legal_name text not null,
  birth_date date not null,
  identity_document_path text,
  qualification_document_path text,
  identity_fingerprint text,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  counselor_id uuid not null references public.counselor_profiles(user_id),
  status public.consultation_status not null default 'pending_payment',
  price_yen integer not null default 100 check (price_yen >= 0),
  duration_seconds integer not null default 900 check (duration_seconds > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index consultations_user_idx on public.consultations(user_id, created_at desc);
create index consultations_counselor_idx on public.consultations(counselor_id, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  moderation_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_consultation_idx on public.messages(consultation_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id),
  user_id uuid not null references public.profiles(id),
  amount_yen integer not null check (amount_yen >= 0),
  status public.payment_status not null default 'pending',
  provider text,
  provider_payment_id text,
  failure_code text,
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

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultations(id) on delete set null,
  reporter_id uuid not null default auth.uid() references public.profiles(id),
  counselor_id uuid not null references public.counselor_profiles(user_id),
  reason text not null,
  details text not null default '',
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselor_profiles(user_id),
  consultation_id uuid references public.consultations(id) on delete set null,
  source text not null check (source in ('chat','profile','profile_image','user_report','admin')),
  category text not null,
  attempted_content text,
  context jsonb not null default '[]'::jsonb,
  strike integer not null default 0 check (strike between 0 and 2),
  action public.moderation_action not null,
  reviewed boolean not null default false,
  overturned boolean not null default false,
  created_at timestamptz not null default now()
);

create index moderation_events_counselor_idx on public.moderation_events(counselor_id, created_at desc);

create table public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  one_minute_warning boolean not null default true,
  counselor_available boolean not null default true,
  replies boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  token text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create or replace view public.counselor_directory
with (security_invoker = true) as
select
  cp.user_id as id,
  cp.display_name,
  cp.track,
  cp.gender,
  cp.specialties,
  array_to_string(cp.specialties, ' ') as specialties_text,
  cp.bio,
  cp.avatar_path,
  cp.qualification_label,
  cp.is_accepting,
  cp.rating_avg,
  cp.rating_count,
  cp.verification_status,
  (cp.verification_status = 'approved' and cp.is_discoverable and cp.suspended_at is null) as is_discoverable
from public.counselor_profiles cp
where cp.verification_status='approved'
  and cp.is_discoverable
  and cp.suspended_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname',''));
  insert into public.notification_preferences(user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.consultations;
alter publication supabase_realtime add table public.counselor_profiles;
