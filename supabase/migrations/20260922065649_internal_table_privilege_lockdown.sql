-- Lock internal server-only tables away from public Data API roles.
-- Edge Functions access these tables through the service role.

revoke all privileges on table
  public.external_identities,
  public.oauth_states,
  public.rate_limit_buckets
from anon, authenticated;

grant select, insert, update, delete on table
  public.external_identities,
  public.oauth_states,
  public.rate_limit_buckets
to service_role;
