# KoiRela security and abuse controls

Updated: 2026-09-20

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

## Other controls already implemented

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

## Auth provider controls to configure outside source code

Supabase Auth / upstream providers should additionally configure:
- email signup rate limiting
- CAPTCHA / bot protection where appropriate
- password policy
- email confirmation
- OAuth redirect allowlist
- session expiry / refresh policy
- leaked-password protection if available

## Secrets

Never commit:
- Supabase service role key
- Stripe secret or webhook signing secret
- LINE channel secret
- Expo access token
- Apple/Google OAuth secrets

Use Supabase Edge Function secrets / CI secret storage.
