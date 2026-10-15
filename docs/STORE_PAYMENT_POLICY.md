# KoiRela store payment-policy rationale

Updated: 2026-10-05

This note documents why KoiRela's current Stripe payment design is intended to fit the current Apple App Store and Google Play exceptions for real-time one-to-one human services. Re-check the policies immediately before submission because store rules can change.

## Service facts that must remain true

KoiRela's paid product is:
- a live one-to-one session between one customer and one human counselor
- delivered in real time
- 15 minutes per purchase, with optional live extensions
- not a recorded session
- not replayable later
- not one-to-few or one-to-many
- not a purchase of stored digital content, virtual currency, or a subscription

If the product changes so any of these facts stop being true, re-evaluate the payment implementation before release.

## Apple App Store

Apple App Review Guideline 3.1.3(d), Person-to-person Services, states that apps enabling purchases of real-time person-to-person services between two individuals may use purchase methods other than In-App Purchase. Apple gives examples including tutoring, medical consultations, property tours, and fitness training. One-to-few and one-to-many real-time services must use In-App Purchase.

Official guideline:
https://developer.apple.com/jp/app-store/review/guidelines/

### Suggested App Review explanation

“KoiRela enables the purchase of a live, one-to-one service between a customer and an individual human counselor. Each paid session is delivered in real time and is not recorded or replayable. KoiRela does not sell group sessions, subscriptions, virtual currency, or prerecorded digital content. The payment flow therefore uses an external payment processor under App Review Guideline 3.1.3(d), Person-to-person Services.”

Do not characterize the purchase as buying chat messages, digital content, credits, or app functionality. The purchase is for the individual counselor's live service.

## Google Play

Google Play's Payments Policy FAQ states that Google Play Billing is not required for a paid 1:1 online service when:
- the paid service is between two individuals, and
- the paid service is not available for replay afterwards in any Play-distributed app.

The FAQ lists counseling-style services among the examples of qualifying 1:1 online paid services.

Official policy / FAQ:
https://support.google.com/googleplay/android-developer/answer/10281818
https://support.google.com/googleplay/android-developer/answer/9858738

### Suggested Play review explanation

“KoiRela sells a live 1:1 consultation between two individuals. The session is not recorded and cannot be replayed after it ends. The app does not sell group sessions, subscriptions, virtual currency, or recorded digital content.”

## Engineering guardrails

- Do not add replayable chat/session recordings as a paid deliverable without a new store-policy review.
- Do not add paid group sessions without a new billing implementation review.
- Keep the consultation record needed for safety/support separate from a user-facing replayable paid product. Current RLS permits participant message reads only while the consultation is active and before its server-side end time.
- Keep pricing and service descriptions consistent across app UI, store metadata, legal pages, and reviewer notes.
- Re-check Apple and Google policy pages immediately before production submission.
