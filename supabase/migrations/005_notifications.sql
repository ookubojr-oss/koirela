create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete cascade,
  kind text not null check (kind in ('reply','one_minute_warning','counselor_available','consultation_request','system')),
  title text not null,
  body text not null,
  route text,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','cancelled')),
  attempts integer not null default 0,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create unique index notification_one_minute_unique
on public.notification_jobs(user_id, consultation_id, kind)
where kind='one_minute_warning';

alter table public.notification_jobs enable row level security;

create policy notification_jobs_admin_only
on public.notification_jobs
for all
using (public.is_admin())
with check (public.is_admin());

create or replace function public.queue_one_minute_warnings()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  inserted_count integer;
begin
  insert into public.notification_jobs(user_id, consultation_id, kind, title, body, route, scheduled_at)
  select
    c.user_id,
    c.id,
    'one_minute_warning',
    '相談終了まであと1分',
    'KoiRelaの15分相談がまもなく終了します。',
    'chat',
    now()
  from public.consultations c
  join public.notification_preferences np on np.user_id=c.user_id
  where c.status='active'
    and np.enabled
    and np.one_minute_warning
    and c.ends_at > now()
    and c.ends_at <= now() + interval '75 seconds'
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
