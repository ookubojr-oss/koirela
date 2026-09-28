# Environment setup

Do not commit real secrets.

## Supabase

KoiRela production foundation uses the Tokyo project.

Client variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Server-only Edge Function secrets:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- OAuth/provider secrets as configured for LINE and other server-side flows

Enable Realtime for:
- `messages`
- `consultations`
- `counselor_availability`

Configure email/password plus Apple, Google, and LINE authentication before device release testing.

## Stripe

Use Stripe test mode until the full two-device E2E flow passes.

The test webhook endpoint must point to:

`https://mxygxdpzhqsnlewjctgg.supabase.co/functions/v1/stripe-webhook`

Enabled events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Store the webhook signing secret only as the Supabase Edge Function secret `STRIPE_WEBHOOK_SECRET`.
Never commit it.

Before payment testing, confirm the Stripe account itself is enabled for test charges and that any required Connect onboarding is completed.

## Expo / EAS

`mobile/eas.json` maps build profiles to the matching EAS environments:
- development -> development
- preview -> preview
- production -> production

Set these EAS project environment variables for every environment that will be built:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_LEGAL_BASE_URL`

`EXPO_PUBLIC_*` values are client-visible by design. Never place secret/service-role values under an `EXPO_PUBLIC_` name.

Before the first cloud build:
1. Replace `REPLACE_WITH_EAS_PROJECT_ID` in `mobile/app.json` with the actual EAS project ID.
2. Configure the EAS environment variables above.
3. Configure Apple Developer / Bundle ID / merchant identifier.
4. Run a development or preview build before production.

## Security rule

The browser/mobile bundle may receive only public configuration. Service-role keys, Stripe secret keys, webhook secrets, provider client secrets, and admin credentials stay server-side.
