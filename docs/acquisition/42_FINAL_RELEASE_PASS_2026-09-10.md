# Final release pass — 10 September 2026

Scope: stabilisation only. No feature added, no redesign. Repository code, tests, local
build/export evidence and EAS/Vercel records. No provider account, ownership record or
Apple case was changed.

## Changes in this pass

- Subscription prices without a blank state: the Apple catalogue is prefetched as soon as
  an owner session is open on iOS; the paywall renders the last in-process catalogue
  (≤ 10 min) immediately while a fresh read runs; a reload never clears the displayed
  catalogue. On a storefront/currency contradiction the loader answers at once with the
  first catalogue (the centralised France fallback resolves synchronously) and refines in
  the background (short wait, re-read, direct StoreKit 2 read); a coherent refinement is
  published to the open screen. Journal codes: PRODUCTS_FAST_PATH, PRODUCTS_REFINED,
  NATIVE_METADATA_ADOPTED, STOREFRONT_FALLBACK_USED.
- Plan-change matrix extended to Enterprise → Essential (six transitions, each asserting
  ownership verification before `requestPurchase` of the target sku, and the manage
  context keeping the customer on the subscription screen).
- Text input: the whitespace contract and its key-by-key tests are unchanged and pass on
  the final source.

## Apple case 102957593166

Still open and still external. The app displays Apple's `displayPrice` whenever the
catalogue answer is coherent with the storefront; the France table is only a display
fallback for the documented FRA + USD contradiction and is journaled every time it is
used. The discrepancy in Apple's catalogue answer itself is not solved by this pass.

## Verification

Root and mobile TypeScript, root and mobile lint, unit suite, full suite with integration
tests, production web build, iOS Expo export: all green (figures in the commit message).

## Truthful score: 88 / 100

| Area | Score | Evidence and remaining gap |
| --- | ---: | --- |
| Product reliability and native UX | 20/22 | Plan changes reach StoreKit for the target product and stay on the subscription screen; typing preserves whitespace; catalogue prefetch removes the price blank state; six-transition regression matrix. Gap: the last two fixes have been verified on a real iPhone only for the sheet, not yet for the full matrix on the final binary. |
| English/French localization and regional documents | 14/14 | Unchanged from the localization audit; every new string of this cycle exists in both languages. |
| Plans, teams and entitlements | 10/10 | Server entitlement follows only signed Apple transactions; downgrade preference persisted from signed renewal info; Sandbox rebind grant single-use proven on a real database; integration suite green. |
| Privacy, deletion and export | 8/10 | Unchanged. Production execution evidence and legal retention review remain owner items. |
| Email and customer communications | 7/10 | Resend configured in production; sending-domain status still reported as unknown by the restricted key; no inbox receipt captured in this cycle. |
| App Store, TestFlight and payments | 11/14 | Builds 33–36 processed by TestFlight; purchase, restore, ownership conflict and downgrade sheet exercised on device; France fallback shows numeric prices. Gap: Apple's FRA/USD catalogue answer (case 102957593166) is unresolved, the direct-vs-wrapper report has not been captured yet, and App Review has not seen the binary. |
| Infrastructure transferability | 9/10 | Production deploys from `integration/devisera-final` with migrations in the build command; health reports commit and database; handoff documents cover StoreKit, Sandbox rebind and captures. Gap: owner-held billing/ownership records. |
| IP, legal and marketplace package | 9/10 | Unchanged; owner sign-off items remain. |

95+ is not justified while Apple's catalogue answer is open and the final binary has not
completed a device regression of the six plan transitions. 100 is not truthful for an
unreviewed App Store submission.

## App Review readiness

The application itself is ready to submit: the price surface is numeric on the French
storefront, purchase/restore/management paths are exercised, legal pages respond, and the
diagnostics UI is compiled out of the production profile. The one external blocker is
Apple's own metadata answer, which does not block review but should be resolved or
disclosed before public launch.
