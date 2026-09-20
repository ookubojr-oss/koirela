# KoiRela production checklist

Updated: 2026-09-20

## Implemented in feature/production-foundation

- [x] Production branch separated from the HTML prototype
- [x] Supabase schema for profiles, counselors, consultations, messages, payments, ratings, reports, blocks, notifications, moderation and audit logs
- [x] Row Level Security baseline
- [x] Auth profile bootstrap
- [x] Counselor discovery filters: type, gender, name/content, approved, accepting, not suspended
- [x] Server-authoritative 15-minute start/end timestamp
- [x] Stripe PaymentIntent creation for initial 100 JPY consultation
- [x] Stripe webhook processing
- [x] 15-minute 100 JPY paid extension with idempotent webhook handling
- [x] Cancel-before-start and refund path
- [x] Realtime messages and consultation state
- [x] Server-side counselor-only off-platform solicitation screening
- [x] First violation warning / second violation suspension
- [x] User report requires admin confirmation before becoming a strike
- [x] Suspended counselor cannot accept consultations
- [x] Counselor availability ON/OFF
- [x] Push notification foundation
- [x] One-minute local notification based on server ends_at
- [x] Private counselor verification document storage
- [x] Counselor application and admin approval/rejection RPC
- [x] Production admin dashboard with admin authentication
- [x] Admin moderation review, overturn, restore, user-report confirmation and audit logs
- [x] Admin counselor application review with temporary signed document links
- [x] Expo / React Native mobile foundation
- [x] Mobile Apple / Google OAuth foundation
- [x] Mobile email sign-in
- [x] Mobile home / find / my page
- [x] Mobile PaymentSheet flow
- [x] Mobile waiting / realtime chat / extension / end
- [x] Mobile counselor reception and request acceptance
- [x] Mobile user profile image choose / take / delete
- [x] Mobile counselor application with image/document upload
- [x] Mobile consultation history
- [x] Mobile rating / report / block
- [x] Mobile notification and safety settings
- [x] In-app account-deletion initiation workflow
- [x] LP updated to current visual system and 15-min / 100-yen model
- [x] README and environment documentation updated

## Requires external account configuration before it can be live

- [ ] Create production Supabase project and apply migrations
- [ ] Configure Supabase Auth redirect URLs
- [ ] Configure Apple OAuth credentials
- [ ] Configure Google OAuth credentials
- [ ] Implement/configure LINE login with owned LINE channel credentials
- [ ] Create Stripe account and set test/live keys
- [ ] Deploy Stripe webhook and Edge Functions
- [ ] Decide counselor revenue share / payout policy
- [ ] Select and configure counselor payout provider / Stripe Connect if appropriate
- [ ] Configure Expo EAS project
- [ ] Configure Apple Developer Team / Bundle ID / merchant identifier
- [ ] Configure Google Play package / payment capabilities if Android release is planned
- [ ] Configure Expo push credentials / APNs / FCM
- [ ] Create at least one real admin account and assign role=admin
- [ ] Decide identity-verification provider or manual-review operating procedure
- [ ] Final legal review: terms, privacy, operator information, cancellation/refund, log retention
- [ ] Define actual account deletion processing/purge worker and legally required retention exceptions
- [ ] Build and run native app on real iPhone / Android devices
- [ ] Test payment, cancellation/refund, timer recovery, background/foreground and poor networks
- [ ] Test moderation bypass attempts and false positives
- [ ] Accessibility and localization review
- [ ] App Store Connect metadata/screenshots/privacy declarations
- [ ] TestFlight review and production submission

## Important

The code foundation is not the same as a live service. No production secrets are committed to Git. Payment, authentication, push, identity verification, deletion completion and App Store submission cannot be completed until the corresponding external accounts and credentials are configured.
