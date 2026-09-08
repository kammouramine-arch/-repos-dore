# DEVISERA final integration

## Scope and merge

Branch: `integration/devisera-final`.
Parents: engineering `ccb0094af7fe521127bf3d7b5efdc12d721a8506`;
Claude UI `2ad5445f888290168f0756eef4add515dd125e25`.
Neither source branch was rewritten.

Four textual conflicts:

- Root navigator: Claude's header/back presentation; engineering verification
  and entitlement guards. One protected stack prevents unverified deep links.
- Account: Claude's information architecture; mounted error guards, normalized
  verification codes and immediate adoption of the persisted server session.
- Paywall: Claude PlanCard and StoreKit displayPrice; engineering purchase
  synchronization/diagnostics and translated highlights.
- API client: preserve history compatibility, connect payments to the same service.

Claude's brand backdrop, settings components, plan-card layout and gradient
tokens are unchanged. Tab animation now stops on interruption/unmount, without
delaying navigation.

## Verification

Full unit/database suite: 396 passing tests in 57 files on isolated PostgreSQL 17.
Root/mobile TypeScript and lint pass. Production Next build and iOS Expo
JavaScript export pass. These are not native StoreKit/device tests.

Playwright: all 10 desktop/mobile-browser cases pass. The fixture waits for
the authenticated page and a 200 session response before subsequent navigation.
This avoids aborting a still-completing sign-in action in the trial test.
The Windows runner remained alive during teardown after reporting all ten
cases as OK; it was interrupted after the cases finished. Do not interpret
this run as a verified zero-exit CI job. The local test database was stopped.

Local HTTP smoke check: Privacy, Terms and Mentions légales return 200;
unauthenticated billing/payments returns 401.

Mock StoreKit tests exercise product prices, failed eligibility lookup,
purchase dispatch failure, cancellation without product ID, server rejection,
finish-after-verification ordering and restore. Apple signature/entitlement
tests are also included in the full suite.

Browser fixtures explicitly assert that the console provider cannot deliver
verification mail, then mark only the isolated test identity verified for the
subsequent browser journeys. No test bypass was added to production code.

## Reproducing local database tests

Use an isolated PostgreSQL cluster, never production. This pass used a workspace
sibling `integration-postgres/data`, bound only to 127.0.0.1:55432, database
`devisia_test`. No production environment file was modified.

Set `TEST_DATABASE_URL` to that local test database and run `npm test`.
The suite validates the test target and applies all five migrations.
Do not reuse this trust-authenticated local test configuration in production.

## Real-iPhone acceptance still required

Install the eventual integration build, record its number and test both languages:

1. Fresh signup: receive code, reject wrong code, verify, reach paywall.
2. Verified login: no email code; entitled → app, not entitled → subscription.
3. Unverified login: verification; Back/change-email/resend/background/resume.
4. Cold start and session restore; offline retry without losing account state.
5. Apple French storefront: real EUR displayPrice; UK GBP and US USD on their
   respective test storefronts. Language alone must not force currency.
6. Purchase/cancel/restore: confirm server entitlement and automatic app routing.
   Reinstall and restore on the same app account; no duplicate subscriptions.
7. Mon espace/Mon compte, rapid tabs, repeated +, keyboard-open Back, resume.
8. Billing: Apple links/no fabricated rows; Stripe real invoices and portal.
9. Rate App, support composer, all three legal links.
10. Disposable solo test account deletion: account cannot log in again.
    Team owner with teammates must transfer first. Cancel billing beforehand.

Capture the bounded diagnostics on failure, not receipts/passwords/codes.

## Remaining external/public-release constraints

- No physical iPhone, native purchase, Apple branding, or live receipt acceptance
  was verified by this source integration. Windows export is not an IPA archive.
- Publisher identity on Mentions légales is still incomplete. Owner must supply
  the correct legal entity/address/registration and obtain legal review. Do not
  market that draft as legally complete.
- Deploy this backend before testing the new billing endpoint on an iPhone.
- Resend inbox delivery, Vercel rules and App Store settings were not changed.
- No EAS build or TestFlight submission is performed in this integration pass.
