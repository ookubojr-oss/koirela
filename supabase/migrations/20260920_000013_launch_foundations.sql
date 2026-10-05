-- Final launch foundations: LINE identity mapping, abuse controls, monitoring, and Stripe Connect payouts.

create table public.external_identities (
  provider text not null,
  subject text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(provider,subject),
  unique(provider,user_id)
);
alter table public.external_identities enable row level security;

create table public.oauth_states (
  state_hash text primary key,
  provider text not null,
  nonce text not null,
  app_redirect_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.oauth_states enable row level security;

create table public.rate_limit_buckets (
  scope text not null,
  bucket_key text not null,
  window_started_at timestamptz not null,
  count integer not null default 0,
  primary key(scope,bucket_key)
);
alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
) returns table(allowed boolean,remaining integer,retry_after_seconds integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz:=now();
  v_row public.rate_limit_buckets%rowtype;
  v_elapsed numeric;
begin
  if p_limit<1 or p_window_seconds<1 then raise exception 'Invalid rate limit configuration'; end if;

  insert into public.rate_limit_buckets(scope,bucket_key,window_started_at,count)
  values(p_scope,p_bucket_key,v_now,0)
  on conflict(scope,bucket_key) do nothing;

  select * into v_row from public.rate_limit_buckets
  where scope=p_scope and bucket_key=p_bucket_key
  for update;

  v_elapsed:=extract(epoch from (v_now-v_row.window_started_at));

  if v_elapsed>=p_window_seconds then
    update public.rate_limit_buckets
    set window_started_at=v_now,count=1
    where scope=p_scope and bucket_key=p_bucket_key;

    return query select true,p_limit-1,0;
    return;
  end if;

  if v_row.count>=p_limit then
    return query select false,0,greatest(1,ceil(p_window_seconds-v_elapsed)::integer);
    return;
  end if;

  update public.rate_limit_buckets
  set count=count+1
  where scope=p_scope and bucket_key=p_bucket_key;

  return query select true,greatest(0,p_limit-(v_row.count+1)),0;
end;
$$;

create table public.error_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('mobile','web','edge','payment','push')),
  severity text not null default 'error' check (severity in ('info','warning','error','fatal')),
  name text,
  message text not null,
  stack text,
  context jsonb not null default '{}'::jsonb,
  app_version text,
  created_at timestamptz not null default now()
);
alter table public.error_events enable row level security;
create policy "admin error events read" on public.error_events for select using (public.is_admin());

alter table public.counselor_payout_accounts
  add column if not exists details_submitted boolean not null default false,
  add column if not exists payouts_enabled boolean not null default false,
  add column if not exists charges_enabled boolean not null default false,
  add column if not exists last_synced_at timestamptz;

create unique index if not exists counselor_payout_provider_account_idx
on public.counselor_payout_accounts(provider_account_id)
where provider_account_id is not null;

alter table public.payouts
  add column if not exists provider_transfer_id text,
  add column if not exists processed_by uuid references public.profiles(id) on delete set null;

create unique index if not exists payouts_provider_transfer_idx
on public.payouts(provider_transfer_id)
where provider_transfer_id is not null;
