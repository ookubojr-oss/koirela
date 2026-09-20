-- Favorites, counselor earnings/payouts, support, maintenance and analytics.

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  counselor_id uuid not null references public.counselor_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,counselor_id),
  check (user_id<>counselor_id)
);
alter table public.favorites enable row level security;
create policy "own favorites read" on public.favorites for select using (user_id=auth.uid());
create policy "own favorites insert" on public.favorites for insert with check (user_id=auth.uid());
create policy "own favorites delete" on public.favorites for delete using (user_id=auth.uid());

create table public.counselor_payout_accounts (
  counselor_id uuid primary key references public.counselor_profiles(user_id) on delete cascade,
  provider text not null default 'manual',
  provider_account_id text,
  bank_label text,
  account_holder_masked text,
  status text not null default 'not_configured' check (status in ('not_configured','pending','verified','disabled')),
  updated_at timestamptz not null default now()
);
alter table public.counselor_payout_accounts enable row level security;
create policy "counselor payout self read" on public.counselor_payout_accounts for select using (counselor_id=auth.uid());
create policy "admin payout read" on public.counselor_payout_accounts for select using (public.is_admin());
create policy "admin payout update" on public.counselor_payout_accounts for update using (public.is_admin());

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselor_profiles(user_id),
  period_start date not null,
  period_end date not null,
  gross_jpy integer not null default 0 check (gross_jpy>=0),
  platform_fee_jpy integer not null default 0 check (platform_fee_jpy>=0),
  net_jpy integer not null default 0 check (net_jpy>=0),
  status text not null default 'pending' check (status in ('pending','held','processing','paid','failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payouts enable row level security;
create policy "counselor payouts self read" on public.payouts for select using (counselor_id=auth.uid());
create policy "admin payouts read" on public.payouts for select using (public.is_admin());
create policy "admin payouts manage" on public.payouts for all using (public.is_admin()) with check (public.is_admin());

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('payment','counselor','bug','account','other')),
  subject text not null check (char_length(subject) between 1 and 120),
  message text not null check (char_length(message) between 1 and 3000),
  status text not null default 'open' check (status in ('open','in_progress','answered','closed')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
create policy "own support read" on public.support_tickets for select using (user_id=auth.uid());
create policy "own support create" on public.support_tickets for insert with check (user_id=auth.uid());
create policy "admin support read" on public.support_tickets for select using (public.is_admin());
create policy "admin support update" on public.support_tickets for update using (public.is_admin());

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.app_settings enable row level security;
create policy "public app settings read" on public.app_settings for select using (key in ('maintenance','announcement','minimum_version'));
create policy "admin app settings manage" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings(key,value)
values
  ('maintenance','{"enabled":false,"title":"メンテナンス中","message":"現在メンテナンスを行っています。しばらくしてからお試しください。"}'::jsonb),
  ('announcement','{"enabled":false,"message":""}'::jsonb)
on conflict(key) do nothing;

create or replace function public.counselor_earnings_summary(p_counselor_id uuid default auth.uid())
returns table(
  today_consultations bigint,
  month_consultations bigint,
  month_gross_jpy bigint,
  estimated_platform_fee_jpy bigint,
  estimated_net_jpy bigint
)
language sql
stable
security definer
set search_path=public
as $$
  with eligible as (
    select c.id,c.started_at,
      coalesce(sum(case when p.status='succeeded' and p.kind in ('initial','extension') then p.amount_jpy else 0 end),0)::bigint gross
    from public.consultations c
    left join public.payments p on p.consultation_id=c.id
    where c.counselor_id=p_counselor_id
      and c.status='ended'
    group by c.id,c.started_at
  ), totals as (
    select
      count(*) filter (where started_at::date=current_date) today_count,
      count(*) filter (where date_trunc('month',started_at)=date_trunc('month',now())) month_count,
      coalesce(sum(gross) filter (where date_trunc('month',started_at)=date_trunc('month',now())),0)::bigint month_gross
    from eligible
  )
  select
    today_count,
    month_count,
    month_gross,
    floor(month_gross*0.20)::bigint,
    (month_gross-floor(month_gross*0.20))::bigint
  from totals
  where p_counselor_id=auth.uid() or public.is_admin();
$$;

create or replace function public.admin_analytics_summary()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select case when public.is_admin() then jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'counselors', (select count(*) from public.counselor_profiles where verification_status='approved'),
    'consultations_total', (select count(*) from public.consultations),
    'consultations_today', (select count(*) from public.consultations where created_at::date=current_date),
    'completed_month', (select count(*) from public.consultations where status='ended' and date_trunc('month',created_at)=date_trunc('month',now())),
    'gross_month_jpy', (select coalesce(sum(amount_jpy),0) from public.payments where status='succeeded' and kind in ('initial','extension') and date_trunc('month',created_at)=date_trunc('month',now())),
    'reports_open', (select count(*) from public.reports where status='open'),
    'support_open', (select count(*) from public.support_tickets where status in ('open','in_progress')),
    'deletion_pending', (select count(*) from public.account_deletion_requests where status='pending')
  ) else '{}'::jsonb end;
$$;

create or replace function public.admin_update_maintenance(p_enabled boolean,p_title text,p_message text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  insert into public.app_settings(key,value,updated_at,updated_by)
  values('maintenance',jsonb_build_object('enabled',p_enabled,'title',left(p_title,120),'message',left(p_message,500)),now(),auth.uid())
  on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=auth.uid();

  insert into public.admin_audit_logs(admin_id,action,target_type,target_id,metadata)
  values(auth.uid(),'update_maintenance','app_setting','maintenance',jsonb_build_object('enabled',p_enabled));
end;
$$;
