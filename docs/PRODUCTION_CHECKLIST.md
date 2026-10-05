# KoiRela production checklist

Updated: 2026-10-05

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
- [x] Admin user/counselor/report/support operations
- [x] Admin Stripe refund foundation
- [x] Admin audit history
- [x] Maintenance mode
- [x] API rate limiting for payment/message/consultation/auth/error endpoints
- [x] Client error reporting / error dashboard
- [x] Push delivery error tracking and invalid-token cleanup
- [x] Account deletion backend and de-identification path
- [x] Internal OAuth/rate-limit/identity mapping tables removed from anon/authenticated Data API access
- [x] Current SECURITY DEFINER RPC surface reviewed for internal admin/ownership checks
- [x] Paid consultation messages are participant-readable only while the live session is active; retained copies remain server-side for safety/support
- [x] Supabase dependency versions pinned in Edge Functions and mobile code
- [x] GitHub Actions upgraded; dependency advisories are reported and critical findings block CI
- [x] PR diff scanned for common secret/private-key patterns

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
- [x] Stripe test webhook endpoint created
- [x] Supabase Stripe webhook Edge Function deployed
- [x] Stripe Google Pay environment follows the configured test/live publishable key
- [x] Apple / Google store payment-policy rationale documented for live 1:1 human services

## External configuration / real-world actions still required

- [x] Align the Stripe Dashboard account, ChatGPT-connected Stripe account, Supabase `STRIPE_SECRET_KEY`, and webhook signing secret to the same Stripe test account (`acct_1UN65vFW3D2XiSVi`). Mobile publishable-key deployment remains part of EAS setup
- [x] Verify `STRIPE_WEBHOOK_SECRET` is the signing secret for webhook `we_1UN7jSFW3D2XiSViNQv4ihsK`; signed Stripe event returned HTTP 200
- [ ] Complete Stripe account activation / business verification
- [ ] Enable/configure Stripe Connect for the actual business model
- [ ] Set final counselor platform fee, payout schedule and tax process
- [ ] Enable Supabase Auth leaked-password protection
- [ ] Configure Supabase Auth redirect URLs, email templates and auth security settings
- [ ] Configure Apple OAuth credentials
- [ ] Configure Google OAuth credentials
- [ ] Create/configure LINE Login channel and set callback URL / secrets
- [ ] Configure Expo EAS project and replace `REPLACE_WITH_EAS_PROJECT_ID`
- [ ] Set EAS public environment variables, including Stripe publishable key and legal base URL
- [ ] Configure Apple Developer Team / Bundle ID / merchant identifier
- [ ] Configure APNs / FCM / Expo push credentials
- [ ] Create/assign a real admin account
- [ ] Create and approve at least one counselor test account
- [ ] Choose final identity-verification provider or formalize manual review
- [ ] Replace legal placeholders with actual operator information
- [ ] Professional legal/tax review of terms, privacy, commerce disclosure, payouts and retention
- [ ] Final App Store icon, splash and screenshots
- [ ] Complete App Store privacy answers from deployed production SDK/data map
- [ ] Run real-device two-account E2E matrix
- [ ] Run Stripe test payments/refunds/Connect payouts end to end
- [ ] Run LINE/Apple/Google login on production-like builds
- [ ] Accessibility review
- [ ] Commit a reproducible mobile lockfile once dependencies are installed in the release environment
- [ ] TestFlight review
- [ ] Production submission

## Current verified state

- Supabase project `KoiRela Tokyo` is active and healthy in Tokyo.
- Realtime is enabled for `consultations`, `counselor_availability`, and `messages`.
- KoiRela Storage has a public `avatars` bucket and private `counselor-verification` bucket.
- Server-only tables `external_identities`, `oauth_states`, and `rate_limit_buckets` have RLS enabled and no anon/authenticated table privileges.
- Security Advisor still reports intentional authenticated SECURITY DEFINER RPC warnings; each current function was reviewed for its admin/ownership guard instead of being blindly converted.
- Leaked-password protection is still disabled and must be enabled before launch.
- Database currently has one Auth user/profile, zero admin accounts, zero approved counselors, zero payments, and zero consultations.
- Stripe webhook infrastructure is aligned and signature-verified against the KOIRIA sandbox. Full 100-yen consultation E2E still requires two real Supabase Auth sessions (customer + approved counselor).
- PR #2 remains a draft and must not be merged to `main` until provider configuration and real-device tests pass.

## Important

“Implemented” means the source-code foundation exists. It does not mean external providers are connected or that live money/auth/push has been verified.

Never commit service-role keys, Stripe secret keys, webhook signing secrets, OAuth client secrets, or Apple credentials.
