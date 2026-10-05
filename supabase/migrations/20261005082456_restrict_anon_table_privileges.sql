-- Restrict the unauthenticated PostgREST role to the three tables
-- that are intentionally readable before sign-in. Row-level policies still
-- further restrict which rows are visible.

revoke all privileges on all tables in schema public from anon;

grant select on table public.app_settings to anon;
grant select on table public.counselor_availability to anon;
grant select on table public.counselor_profiles to anon;
