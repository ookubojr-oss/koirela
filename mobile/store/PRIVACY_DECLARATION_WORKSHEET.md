# App privacy declaration worksheet

Finalize against the live production configuration before App Store submission.

Potential data categories in the current design:
- Email address / account identifier
- User ID / external OAuth identifiers
- User content: chat messages, reports, support inquiries
- Purchases: payment state, amount, refund identifiers
- Diagnostics: error name/message/stack, app version
- Push notification token / device platform
- Profile data: nickname, profile image, optional counselor gender
- Counselor verification: identity and qualification documents

Purpose candidates:
- app functionality
- fraud prevention / security
- customer support
- analytics / reliability

Important:
- Stripe should hold raw card data; KoiRela stores provider payment identifiers and amounts.
- Counselor verification documents are private operational data and are not public profile content.
- Do not mark categories as collected/not collected until the deployed SDKs and production logging have been audited.
