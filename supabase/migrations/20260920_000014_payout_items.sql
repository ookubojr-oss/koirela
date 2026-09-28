-- Stripe Connect payout allocation tracking.

alter table public.payouts
  add column if not exists provider_payout_id text;

create unique index if not exists payouts_provider_payout_idx
on public.payouts(provider_payout_id)
where provider_payout_id is not null;

create table public.payout_items (
  payout_id uuid not null references public.payouts(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete restrict,
  amount_jpy integer not null check (amount_jpy>0),
  primary key(payout_id,payment_id),
  unique(payment_id)
);
alter table public.payout_items enable row level security;

create policy "counselor payout items self read" on public.payout_items
for select using (
  exists (
    select 1 from public.payouts p
    where p.id=payout_id and p.counselor_id=auth.uid()
  )
);

create policy "admin payout items read" on public.payout_items
for select using (public.is_admin());
