# KoiRela App Store release checklist

## App identity

- App name: KoiRela
- Bundle ID scaffold: jp.koirela.app
- URL scheme: koirela
- Primary language: Japanese
- Category candidate: Lifestyle
- Price: Free download; consultation service is paid inside the app flow

Replace bundle/merchant/EAS identifiers with values owned by the production Apple Developer account before submission.

## Required assets

Create final, brand-approved assets before build submission:
- 1024 x 1024 App Store icon, no transparency
- launch/splash image
- iPhone screenshots for the currently required display sizes
- optional iPad assets only if iPad support is later enabled
- support URL
- privacy policy URL
- marketing URL

Do not submit placeholder or generated test screenshots.

## Review notes

Suggested review note:
“KoiRela connects a customer and a human counselor in a one-to-one, real-time chat session. The standard session is 15 minutes for JPY 100. A reviewer test account and a counselor test account will be provided in App Review Information. The service includes reporting, blocking, counselor identity review, account deletion, and moderation for off-platform solicitation.”

Before submission, verify the payment method against the current App Store Review Guidelines and the actual service model/configuration.

## Account deletion

The Settings screen contains an in-app account deletion flow. Test that:
- active consultations prevent deletion
- deleting removes Auth access
- profile/uploads/push tokens are removed
- required transaction/safety records are de-identified according to the production retention policy

## Sign in

If third-party login is offered, verify Apple sign-in requirements for the final combination of login providers.

Current code foundation includes:
- email/password + confirmation
- Apple
- Google
- LINE custom OAuth bridge

Provider credentials and redirect URLs still require production configuration.

## Privacy

Complete App Store privacy disclosures from the final production data map, not from assumptions. Review:
- contact info / account identifiers
- user content / chat
- purchases
- diagnostics
- usage data
- identifiers / push token
- sensitive verification documents for counselors

## TestFlight exit criteria

- fresh install / registration
- login and password reset
- browse/search/filter counselors
- favorite + favorite online notification
- initial payment
- counselor receives request
- consultation starts
- realtime messages in both directions
- background / foreground
- force close and resume active consultation
- one-minute warning
- paid extension
- consultation end
- rating/report/block
- payment history
- refund from admin
- account suspension
- account deletion
