# KoiRela security and abuse controls

Updated: 2026-10-05

## Server-authoritative controls

The mobile/web clients are not authoritative for:
- consultation start/end time
- price
- payment success/refund success
- counselor or user suspension
- moderation strikes
- payout eligibility
- payout amount

## Current Edge Function rate limits

Initial defaults in the production foundation:
- consultation payment creation: 5 attempts / 10 minutes / user
- extension payment creation: 8 attempts / 10 minutes / user
- message send: 45 messages / minute / user
- consultation accept/start: 20 attempts / 5 minutes / counselor
- client error reporting: 30 reports / 5 minutes / user
- LINE auth start: 20 attempts / 10 minutes / source IP

These are anti-abuse defaults, not performance targets. Tune after observing real traffic.

## Other controls implemented

- one active consultation per customer
- one active consultation per counselor
- suspended users are rejected by authenticated Edge Functions
- suspended counselors are removed from discovery and reception
- blocked customer/counselor pairs cannot start a paid consultation
- Stripe webhook signature verification
- idempotent paid extension application
- server-side off-platform solicitation checks for counselor messages
- counselor profile text is checked server-side for off-platform contact data
- moderation first strike warning, second strike suspension
- user reports do not count as strikes until admin confirmation
- admin actions are recorded
- invalid Expo push tokens are removed after DeviceNotRegistered responses
- LINE OAuth state/nonce verification with a required channel secret
- server-only OAuth identity/state/rate-limit tables are not accessible to anon/authenticated roles
- Supabase JS versions are pinned for the mobile app and shared Edge Function imports
- CI fails on high/critical production dependency advisories
- common secret/private-key patterns are absent from the current PR diff

## Supabase Security Advisor review

Current intentional findings:
- `external_identities`, `oauth_states`, and `rate_limit_buckets` have RLS enabled without client policies because they are server-only. anon/authenticated table privileges are revoked.
- Authenticated SECURITY DEFINER RPC warnings remain for selected admin/ownership helpers. The current functions were reviewed for explicit `is_admin()`, `auth.uid()`, or intended aggregate-read restrictions.

Do not silence these warnings by blindly granting policies, revoking intended RPC access, or changing functions to SECURITY INVOKER without testing the authorization model.

Outstanding:
- Supabase Auth leaked-password protection is disabled and should be enabled before launch.
- Multiple permissive-policy and unused-index advisories are performance observations. Do not remove policies/indexes solely to clear the advisor before representative traffic exists.

## Auth provider controls to configure outside source code

Supabase Auth / upstream providers should additionally configure:
- email signup rate limiting
- CAPTCHA / bot protection where appropriate
- password policy
- email confirmation templates
- OAuth redirect allowlist
- session expiry / refresh policy
- leaked-password protection
- Apple / Google / LINE production credentials

## Secrets

Never commit:
- Supabase service role / secret key
- Stripe secret or webhook signing secret
- LINE channel secret
- Expo access token
- Apple/Google OAuth secrets

Use Supabase Edge Function secrets, EAS environment variables and provider secret stores.
