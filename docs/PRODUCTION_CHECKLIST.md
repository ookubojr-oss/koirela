# KoiRela production checklist

Updated: 2026-09-22

## Implemented in feature/production-foundation

### Core
- [x] Production branch separated from HTML prototype
- [x] Supabase schema / RLS / Storage / Realtime foundation
- [x] Email signup, email confirmation and password reset
- [x] Apple / Google OAuth foundation
- [x] LINE Login OAuth bridge foundation
- [x] Counselor search by name/content/type/gender
- [x] Favorites and counselor-online notification
- [x] Consultation history and one-tap reconsult
- [x] Server-authoritative 15-minute timer
- [x] Initial 100 JPY payment and 100 JPY extension
- [x] Cancel-before-start and refund flow
- [x] Payment history / receipt-information screen
- [x] Realtime messaging
- [x] Waiting/active consultation recovery after app restart
- [x] Push notifications and one-minute warning
- [x] Rating tags / report / block

### Counselor
- [x] Counselor application
- [x] Identity / qualification private uploads
- [x] Counselor profile edit including photo/camera/remove
- [x] Counselor availability ON/OFF
- [x] Counselor earnings summary
- [x] Stripe Connect payout onboarding foundation
- [x] Admin-triggered counselor payout allocation/transfer foundation

### Safety / operations
- [x] Counselor-only off-platform solicitation detection
- [x] First violation warning / second violation suspension
- [x] User report only counts after admin confirmation
- [x] User account suspension state
- [x] Counselor suspension / restore
- [x] Admin user search by email/nickname/ID
- [x] Admin counselor search / violations / reception / payout state
- [x] Admin force-end consultation
- [x] Admin Stripe refund
- [x] Admin moderation and audit history
- [x] Support ticket management
- [x] Maintenance mode
- [x] API rate limiting for payment/message/consultation/auth/error endpoints
- [x] Client error reporting / error dashboard
- [x] Push delivery error tracking and invalid-token cleanup
- [x] Account immediate deletion backend and de-identification path
- [x] Internal OAuth/rate-limit tables removed from anon/authenticated Data API access

### Release preparation
- [x] LP aligned with current 15-min / 100-yen model
- [x] Legal draft pages: terms/privacy/commercial-law/refund/counselor terms
- [x] App Store metadata draft
- [x] App privacy declaration worksheet
- [x] App Store release checklist
- [x] Device test matrix
- [x] Maestro smoke flows
- [x] GitHub Actions type/static checks
- [x] Security/rate-limit documentation

## External configuration / real-world actions still required

- [x] Create production Supabase project and apply all migrations
- [ ] Configure Supabase Auth URLs, email templates and auth security settings
- [ ] Configure Apple OAuth credentials
- [ ] Configure Google OAuth credentials
- [ ] Create LINE Login channel, approve email permission if used, set callback URL and secrets
- [ ] Create Stripe account and set test/live keys
- [ ] Enable/configure Stripe Connect for the actual business model
- [ ] Set final counselor platform fee, payout schedule and tax process
- [x] Deploy Edge Functions and Stripe webhook
- [ ] Configure Expo EAS project
- [ ] Configure Apple Developer Team / Bundle ID / merchant identifier
- [ ] Configure APNs / FCM / Expo push credentials
- [ ] Create real admin account and assign role=admin
- [ ] Choose final identity-verification provider or formalize manual review
- [ ] Replace all legal placeholders with actual operator information
- [ ] Professional legal/tax review of terms, privacy, commerce disclosure, payouts and retention
- [ ] Final App Store icon, splash and screenshots
- [ ] Complete App Store privacy answers from deployed production SDK/data map
- [ ] Run real-device two-account E2E matrix
- [ ] Run Stripe test payments/refunds/Connect payouts end to end
- [ ] Run LINE/Apple/Google login on production-like builds
- [ ] Accessibility review
- [ ] TestFlight review
- [ ] Production submission

## Current status notes

- Production Supabase project is active and healthy.
- Database migrations are applied through the current production hardening migration.
- Edge Functions including Stripe webhook are deployed.
- Supabase Security Advisor still reports intentional SECURITY DEFINER RPC warnings for authenticated-only functions that perform their own admin/ownership checks; these were reviewed rather than blindly converted to SECURITY INVOKER.
- Auth provider credentials, Stripe credentials, and the first real admin user are still external-account tasks.

## Important

“Implemented” means source-code foundation exists in this branch. It does not mean external providers are connected or that live money/auth/push has been verified.

No production secrets are committed to Git. Do not merge to `main` until provider configuration and real-device tests have passed.
