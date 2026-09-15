# Apple onboarding finish — 2026-09-08

Scope: preserve the accepted visual system. No new EAS/TestFlight build or production deployment performed in this pass.

## Findings and changes

- Current iOS price path is native `fetchProducts` -> `displayPrice` -> `appleOffer` -> PlanCard. No literal $35/$69/$129 exists in mobile source. The prior live audit found those USD amounts in Apple's territory price tables. This does not prove the device's current native response. The installed build/source and its native product journal must be checked before assigning a definitive device root cause.
- A foreground/retry/pre-purchase refresh could share an in-flight request started before the transition. Fresh refreshes now wait for that request and start a subsequent query. No currency conversion, EUR replacement, completed-price cache or fallback was introduced. Tests prove EUR replaces an earlier USD result, for all three plans. If Apple itself continues returning USD, this code cannot honestly promise EUR; real-device acceptance remains open.
- Native registration's optional provider previously allowed a local trial when omitted. It now defaults to Apple purchase-required. Retried unverified owner signup previously retained a legacy local trial. It now conditionally closes only that unbound local promotional trial; Apple/Stripe bindings and invited memberships remain untouched. No production accounts were manually altered. Existing provider-backed access is not revoked.
- No plan is preselected on the paywall. The customer must tap one of the existing three cards before the purchase action enables. The database's Essential placeholder on an incomplete subscription does not grant access; the verified Apple transaction sets the actual selected plan.
- Removed Home's subscription banner entirely. Removed the remaining mobile countdown branch, including its use on the creation screen. No layout, typography, gradient, animation, haptic or navigation redesign.
- Trial copy requires positive native group eligibility AND native free-trial metadata. Unknown/error eligibility does not promise a trial.
- Active Apple trial and paid periods route to app; cancellation of renewal preserves access until signed expiry. Expired or malformed Apple expiry fails closed. Restore and ownership verification remain unchanged and catalogue-independent. Billing grace is not enabled in the previously audited Apple group; no grace duration was invented.
- Session carries Apple's persisted environment. The subscription management card shows the actual access end timestamp, not a fabricated renewal date, and identifies accelerated TestFlight periods for Sandbox. No today-plus-three-days date calculation.

## Verification

443 tests / 63 files passed, including isolated PostgreSQL on localhost:55432. Regression coverage includes all three trial plans, exact signed expiry, verification/subscription/app destinations, cancellation before expiry, expiration, ownership protection, stale USD replacement and forced post-transition fetch. Native SDK and signature decoding are mocked where stated by tests; this is not a real StoreKit purchase test. UI banner/selection assertions are source contract tests, not physical touch tests.

Root/mobile TypeScript and lint passed. Production web build and iOS export passed. Diff whitespace and changed-content secret-pattern checks passed. Existing Prisma configuration and Next middleware deprecation warnings remain.

## Release/physical acceptance

Deploy the backend changes with this commit before evaluating native signup. Build exactly this branch only after review; no new build was requested to run in this pass.

On the next TestFlight candidate:
1. Fresh unverified owner signup -> code received/validated -> all three cards, none selected.
2. Each card shows the current native Apple price; French EUR must match Apple's confirmation sheet. If not, capture the selectable diagnostic report including build, PRODUCT_METADATA and storefront without sharing credentials/receipts.
3. Choose a plan -> eligible trial message only -> Apple confirmation -> Home with no trial banner.
4. Active trial/paid login and restore -> Home; no verification code for verified login.
5. Cancel renewal -> access until Apple's actual expiry; expired -> plans. TestFlight timing may be accelerated.
6. Repeated foreground/reload cannot restore an older price snapshot. Cancellation/failure leaves retry and restore usable.

Status: code checks passed; real EUR agreement with the Apple sheet remains unverified. Do not call the native currency incident resolved or the release production-ready until that check succeeds.
