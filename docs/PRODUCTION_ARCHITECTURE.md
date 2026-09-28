# KoiRela production architecture

This branch keeps the existing static prototype intact while adding the production foundation.

## Stack

- Client prototype: existing index.html
- Production mobile app: Expo / React Native
- Auth / DB / realtime / storage: Supabase
- Server business logic: Supabase Edge Functions
- Payments: Stripe PaymentIntent / PaymentSheet
- Push: Expo push initially, APNs/FCM underneath
- Admin: authenticated web admin backed by server-side moderation and audit data

## Server-authoritative values

The client must never be authoritative for consultation start/end times, price, payment success, counselor suspension state, moderation strike count, identity-verification status, or payout eligibility.

## Golden flow

1. Sign in
2. Browse active counselors
3. Open counselor profile
4. Create a 15-minute consultation for 100 JPY
5. Complete payment authorization
6. Server starts consultation and writes started_at / ends_at
7. Both participants subscribe to messages and consultation state
8. Server rejects messages after consultation end
9. At end: extend with another paid 15-minute block or finish
10. Rating / report / history

## Counselor moderation

- First confirmed automated off-platform solicitation: block message and warn
- Second confirmed automated violation: suspend counselor
- User reports do not increment strikes until an admin confirms them
- Suspended counselors are excluded from discovery and cannot accept new consultations
- Payout eligibility is held for review while suspended
- Prototype moderation retention target: 90 days

## Data privacy

For moderation, retain the violating content and only the contextual window needed for review rather than copying unlimited full-chat history into moderation tables. Final retention and deletion rules require legal review before launch.
