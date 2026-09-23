-- Restrict SECURITY DEFINER RPC exposure after production advisor audit.
-- Anonymous clients do not need to execute application RPC helpers.
revoke execute on all functions in schema public from anon;

-- These helpers are server/trigger-only and must not be callable by ordinary signed-in users.
revoke execute on function public.apply_paid_extension(uuid, text) from authenticated, public;
revoke execute on function public.consume_rate_limit(text, text, integer, integer) from authenticated, public;
revoke execute on function public.record_counselor_violation(uuid, uuid, text, text, jsonb, text) from authenticated, public;
revoke execute on function public.handle_new_auth_user() from authenticated, public;
revoke execute on function public.ensure_counselor_availability() from authenticated, public;

grant execute on function public.apply_paid_extension(uuid, text) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.record_counselor_violation(uuid, uuid, text, text, jsonb, text) to service_role;

-- Prevent future functions from becoming anonymously executable by default.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, public;
