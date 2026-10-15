# KoiRela App Store readiness

Updated: 2026-10-05

## Current status

KoiRela is no longer only an HTML prototype. The `feature/production-foundation` branch now contains the Expo / React Native mobile app, Supabase backend, Realtime chat, Storage, RLS, Edge Functions, Stripe payment foundation, moderation/admin operations, account deletion, release documentation and automated static checks.

The remaining work is primarily external-provider configuration, account verification, real-device validation and App Store submission work.

## Implemented application foundation

- Expo / React Native app with KoiRela app scheme and iOS/Android package scaffolding
- Email/password auth plus Apple / Google / LINE login foundations
- Supabase database, RLS, Storage and Realtime
- Counselor discovery, favorites, history, profile editing and counselor application
- 15-minute / 100 JPY consultation lifecycle and 15-minute extension
- Stripe PaymentIntent, webhook, refund and Connect payout foundations
- Realtime one-to-one chat with server-authoritative consultation timing
- Push notification registration and one-minute warning foundation
- Rating, reporting, blocking, moderation and suspension flows
- Admin operations, support tickets, audit logs and maintenance mode
- In-app account deletion foundation
- Terms / privacy / commercial-law / refund / counselor-term drafts
- App Store metadata, privacy worksheet, device matrix and Maestro smoke flows
- GitHub Actions static/type checks and high-severity production dependency audit

## Launch blockers

1. **Stripe account alignment and activation**
   The Stripe Dashboard account used to copy API keys, the Stripe account connected to tooling, the mobile publishable key and the Supabase server/webhook secrets must all refer to the same Stripe account. Do not run real payment testing until this is verified.

2. **Authentication provider configuration**
   Supabase Auth redirect URLs/security settings and Apple, Google and LINE provider credentials still require external dashboard setup. Leaked-password protection should be enabled before launch.

3. **Expo / Apple release ownership**
   Create/link the EAS project, replace the placeholder EAS project ID, register the Apple Bundle ID and merchant identifier, and configure signing/push credentials.

4. **Test identities**
   A real admin account and at least one approved counselor test account are still required for end-to-end validation.

5. **Real-device validation**
   Run the two-device lifecycle: payment -> waiting -> counselor accepts -> realtime chat -> timer -> extension/end -> rating/refund/recovery.

6. **Legal / store assets**
   Replace operator/domain placeholders, complete professional legal/tax review, finalize icon/splash/screenshots and App Store privacy answers.

## Release rule

Keep Stripe in test mode and keep PR #2 as a draft until provider configuration and the real-device matrix pass. Do not merge the production foundation to `main` or switch to live money solely because static checks pass.
