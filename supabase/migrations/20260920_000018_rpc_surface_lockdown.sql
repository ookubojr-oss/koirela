-- Remove PUBLIC/anonymous RPC execution and grant only the authenticated
-- application RPC surface that is intentionally called from clients/RLS.
revoke execute on all functions in schema public from public, anon;

grant execute on function public.admin_analytics_summary() to authenticated;
grant execute on function public.admin_confirm_report(uuid) to authenticated;
grant execute on function public.admin_overturn_moderation(uuid) to authenticated;
grant execute on function public.admin_restore_counselor(uuid) to authenticated;
grant execute on function public.admin_review_counselor(uuid, public.verification_status, text) to authenticated;
grant execute on function public.admin_update_maintenance(boolean, text, text) to authenticated;
grant execute on function public.counselor_earnings_summary(uuid) to authenticated;
grant execute on function public.counselor_rating_stats() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_current_user_active() to authenticated;
grant execute on function public.request_account_deletion() to authenticated;

-- Internal server RPCs remain service-role-only.
grant execute on function public.apply_paid_extension(uuid, text) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.record_counselor_violation(uuid, uuid, text, text, jsonb, text) to service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;
