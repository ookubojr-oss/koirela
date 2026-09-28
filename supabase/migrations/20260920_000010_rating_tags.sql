-- Rating tags and public aggregate review statistics.

alter table public.ratings
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.ratings
  drop constraint if exists ratings_tags_allowed;

alter table public.ratings
  add constraint ratings_tags_allowed
  check (tags <@ array['話しやすかった','丁寧だった','共感してくれた','整理できた','また相談したい']::text[]);

create or replace function public.counselor_rating_stats()
returns table(counselor_id uuid,average_rating numeric,rating_count bigint)
language sql
stable
security definer
set search_path=public
as $$
  select r.counselor_id,round(avg(r.stars)::numeric,1),count(*)
  from public.ratings r
  join public.counselor_profiles c on c.user_id=r.counselor_id
  where c.verification_status='approved' and c.is_suspended=false
  group by r.counselor_id;
$$;
