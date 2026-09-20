-- Payout policy must be explicitly configured before showing estimates or sending money.
insert into public.app_settings(key,value)
values ('payout_policy','{"enabled":false,"platform_fee_percent":null}'::jsonb)
on conflict (key) do nothing;

drop function if exists public.counselor_earnings_summary(uuid);

create function public.counselor_earnings_summary(p_counselor_id uuid default auth.uid())
returns table(
  today_consultations bigint,
  month_consultations bigint,
  month_gross_jpy bigint,
  estimated_platform_fee_jpy bigint,
  estimated_net_jpy bigint,
  fee_configured boolean,
  platform_fee_percent numeric
)
language sql
stable
security definer
set search_path=public
as $$
  with policy as (
    select
      case
        when coalesce((value->>'enabled')::boolean,false)
          and value->>'platform_fee_percent' is not null
          and (value->>'platform_fee_percent')::numeric between 0 and 100
        then (value->>'platform_fee_percent')::numeric
        else null
      end as fee_percent
    from public.app_settings
    where key='payout_policy'
  ), eligible as (
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
    totals.today_count,
    totals.month_count,
    totals.month_gross,
    case when policy.fee_percent is null then 0 else floor(totals.month_gross*policy.fee_percent/100)::bigint end,
    case when policy.fee_percent is null then totals.month_gross else (totals.month_gross-floor(totals.month_gross*policy.fee_percent/100))::bigint end,
    policy.fee_percent is not null,
    policy.fee_percent
  from totals
  cross join policy
  where p_counselor_id=auth.uid() or public.is_admin();
$$;

revoke execute on function public.counselor_earnings_summary(uuid) from public, anon;
grant execute on function public.counselor_earnings_summary(uuid) to authenticated;
