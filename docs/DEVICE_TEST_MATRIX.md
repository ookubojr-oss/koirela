# Device / E2E test matrix

Run with two real devices whenever testing consultation lifecycle.

| Scenario | Customer device | Counselor device | Expected |
| --- | --- | --- | --- |
| Fresh registration | iPhone | - | Email confirmation returns to app |
| OAuth login | iPhone / Android | - | Apple/Google/LINE session created |
| New consultation | Device A | Device B | Payment -> request -> accept -> active |
| Realtime messaging | Device A | Device B | Messages appear once, in order |
| Customer background | Device A background | Device B active | Timer remains server-authoritative |
| Counselor background | Device A active | Device B background | Push arrives, chat recovers |
| Force close | Kill app | Other device active | Relaunch resumes waiting/active consultation |
| Poor network | throttle/drop | normal | No duplicate payment/extension |
| One minute warning | active | active | Notification only if preference enabled |
| Extension | customer | counselor | Ends-at increases once after settled payment |
| Cancellation | waiting | not accepted | Refund/cancel path succeeds |
| Admin force-end | admin web | both devices | consultation transitions out of active |
| Admin refund | admin web | customer | refund record appears |
| Account suspension | admin web | target device | paid/server actions blocked |
| Account deletion | customer | - | auth access removed; restart shows login |

## Maestro

The repository includes smoke-flow YAML files in .maestro. They require:
- a development build installed
- a configured Supabase project
- test credentials via Maestro environment variables
- Stripe test mode for payment scenarios

PaymentSheet and external OAuth screens should still be manually validated on real hardware.
