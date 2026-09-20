# Environment setup

Do not commit real secrets.

## Supabase

Create one Supabase project and set SUPABASE_URL and SUPABASE_ANON_KEY for clients. Set SUPABASE_SERVICE_ROLE_KEY only as an Edge Function secret.

Run supabase/migrations/20260920_000001_initial.sql.

Enable Realtime for messages, consultations, and counselor_availability.

Configure email/password plus Apple, Google, and LINE authentication as required.

## Stripe

Start in Stripe test mode.

Set Edge Function secrets:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

Configure the stripe-webhook Edge Function for payment_intent.succeeded, payment_intent.payment_failed, and payment_intent.canceled.

## Security rule

The browser/mobile bundle may receive only public configuration. Service-role keys, Stripe secret keys, webhook secrets, provider client secrets, and admin credentials stay server-side.
