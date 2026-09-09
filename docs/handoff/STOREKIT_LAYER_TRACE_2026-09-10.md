# StoreKit price pipeline trace, subscription levels and renewal preference — 2026-09-10

Scope: DEVISERA iOS app (`fr.devisia.app`, Expo SDK 57, expo-iap 5.5.0 → openiap-apple 3.4.0),
Apple case `102957593166`. Nothing in this pass hard-codes EUR, converts USD or overrides a
price from the backend.

## 1. Subscription levels (App Store Connect)

The repository's last direct inspection of group `22361541` (TESTFLIGHT-READINESS.md, 2026-09-08)
records: Entreprise `6808981897` level 1, Pro `6808991416` level 2, Essentiel `6808994981` level 3.
Apple ranks level 1 highest, so this is the intended order: Entreprise > Pro > Essentiel.
This session has no App Store Connect access, so the levels could not be re-read live; they
are portal-only and must be re-checked in ASC → Subscriptions → group `22361541` before
any change. No level was modified.

Consequences already verified in code and tests:
- A fresh Pro purchase renews Pro. Plan is derived only from the signed `transaction.productId`.
- The "Pro → Essential at renewal" wording in Apple's native sheet appears only when a
  paying Pro user taps Essential: that is a downgrade purchase, which StoreKit applies at
  the next renewal. It is not a configuration defect.

## 2. Price pipeline, character for character

| Layer | Source | What it does with the price |
| --- | --- | --- |
| App Store catalogue | server JSON behind `Product.jsonRepresentation` (`href: /v1/catalog/<storefront>/in-apps/…`, `attributes.offers[].currencyCode`, `priceFormatted`) | authoritative answer for the storefront that served it |
| StoreKit 2 | `Product.products(for:)`, `Product.displayPrice`, `priceFormatStyle.currencyCode` | formats the catalogue price; no conversion |
| openiap-apple 3.4.0 (`packages/apple/Sources/OpenIapModule.swift:328`) | `StoreKit.Product.products(for: params.skus)` then `productManager.addProduct` | plain pass-through, an in-memory registry used later for purchase; no persisted price cache |
| openiap-apple `Helpers/StoreKitTypesBridge.swift:70-78` | `displayPrice: product.displayPrice`, `currency: currencyCode(from: product)` = `priceFormatStyle.currencyCode` (iOS 16+) | copies the strings verbatim; intro fields from `subscription.introductoryOffer`, with a `jsonRepresentation` fallback for `paymentMode == .empty` only |
| expo-iap 5.5.0 (`build/index.js:453-497`) | `fetchProducts` → `ExpoIapModule.fetchProducts({skus,type})` then `filterIosItems` by id | filtering only; no normalisation of price/currency |
| `mobile/src/lib/apple-purchases.ts` `loadAppleProducts` | `fetchProducts({skus, type:'subs'})`, `getStorefront()` before and after | logs; refetches once if storefront changed or `consistentAppleCurrency` fails; never rewrites amounts |
| `mobile/src/lib/apple-offer.ts` | `appleOffer` | shows `displayPrice` as-is, or hides it (`mismatch`) when the currency contradicts a known storefront |
| `PlanCard` | `price` prop | renders the string |

Repository audit (B4): no `.storekit` configuration file, no `Products.plist`, no scheme
override, no USD fixture outside unit tests, no Expo plugin option for expo-iap
(`plugins: ['expo-iap']`), no environment-dependent price metadata. Bundle id
`fr.devisia.app`, product ids `fr.devisia.essentiel.monthly` / `fr.devisia.pro.monthly` /
`fr.devisia.entreprise.monthly`, group `22361541` (B5) are consistent across
`app.config.ts`, `@devisia/shared` and the documented ASC state.

Conclusion of the trace: **no layer above StoreKit transforms, caches or substitutes the
price.** A `$35.00 / USD` value displayed on a device whose `Storefront.current` is `FRA`
was produced by StoreKit itself (its `Product` carried a USD `priceFormatStyle`), i.e. by
the catalogue answer StoreKit built the product from.

## 3. Direct native StoreKit 2 path (B3)

New local Expo module `mobile/modules/devisera-storekit` (Swift, autolinked from
`modules/`). `inspectProducts(skus)` calls `Storefront.current` and
`Product.products(for:)` directly, with no wrapper, and returns for each product:
`displayPrice`, decimal `price`, `priceFormatStyle` currency and locale, subscription
period, intro-offer structure, `isEligibleForIntroOffer`, plus an allow-listed view of
`jsonRepresentation`: the catalogue `href` (which names the storefront that served the
metadata) and each offer's `currencyCode` / `priceFormatted` / discounts. No transaction,
receipt, account or device identifier is read.

`mobile/src/lib/storekit-compare.ts` compares the three sources per product and yields one
verdict:
- `MATCH`
- `WRAPPER_DIFFERS_FROM_NATIVE` → the discrepancy is in expo-iap/openiap (fix the library)
- `CATALOG_CURRENCY_DIFFERS_FROM_STOREFRONT` → StoreKit itself answered in another
  currency than the device storefront (Apple-side evidence)
- `NATIVE_MISSING` / `WRAPPER_MISSING`

The comparison runs automatically whenever the wrapper metadata contradicts the storefront
(`STOREKIT_METADATA_MISMATCH`) and on demand from the support report ("Comparer avec
StoreKit en direct", diagnostics build). It is journaled under `path: 'native-storekit'`
and exported by the report; it is never used to display or alter a price.

Result on device: **not yet available.** The module only exists in a binary that includes
this commit (Build 34). Build 33 cannot produce the native reading; the comparison button
is disabled there and the report says `directStorekitModule: absent`.

## 4. Why the native sheet shows EUR while the metadata says USD (B6)

Two different Apple components answer two different questions:
- `Product.products(for:)` returns catalogue metadata that StoreKit fetched for the app,
  formatted with the currency of the storefront that served that metadata.
- The purchase sheet is rendered by the system purchase UI, which resolves the price for the
  Apple Account actually signing the purchase (its storefront), at the moment of purchase.

When the two disagree, the metadata was served for a different storefront than the account
that pays. The evidence the module captures (`catalogPath` such as `/v1/catalog/us/…`
versus `/v1/catalog/fr/…`) states directly which storefront served the metadata. The same
mechanism explains the empty introductory-offer metadata (B8): offers are configured per
territory, and a catalogue answer for a storefront where the offer does not apply carries
no `IntroOffer` discount, while `isEligibleForIntroOffer` (an account-level query) still
returns true.

Which step selects the wrong storefront cannot be proven from source; the candidates,
in order of plausibility, are: (1) TestFlight/sandbox product lookups made before an Apple
Account is authenticated with the sandbox, which Apple serves from a default storefront;
(2) a Sandbox Apple Account whose country is not France; (3) StoreKit's on-device product
metadata cache retaining an earlier storefront's answer. None of these is a bug in DEVISERA
code, and none can be corrected by the app without fabricating prices, which is excluded.

## 5. Safe device experiments (B7), in order

1. On Build 33: open the paywall, tap "Continuer avec Apple" until Apple's sheet appears,
   cancel it, then "Recharger les offres". If EUR now appears, candidate (1) is confirmed:
   the sheet authenticated the sandbox session and later lookups were served for FRA.
2. Settings → App Store → Sandbox Account (visible after a first sandbox purchase attempt):
   confirm the signed-in sandbox tester's country; sign out and back in with a tester whose
   country is France.
3. Delete the app, restart the iPhone, reinstall from TestFlight, open the paywall once.
4. On Build 34: long-press the logo on the paywall (diagnostics profile), "Comparer avec
   StoreKit en direct", copy the report. The `catalogPath` and `catalogCurrency` lines are
   the evidence to attach to case `102957593166`.

## 6. Downgrade confirmation and pending renewal preference (A2, A3)

- `mobile/src/components/plan-change-sheet.tsx`: DEVISERA sheet shown before any StoreKit
  call when an active Pro/Enterprise subscriber selects a lower plan. Explains that the
  current plan stays active until the period end, that the new plan starts at the next
  renewal, that nothing is lost today. Buttons Continuer / Annuler, FR/EN, Reduce Motion.
- Backend: `subscriptions.applePendingProductId` / `applePendingAt` (migration
  `20260910090000_apple_pending_renewal_product`). Filled only from Apple's signed
  `renewalInfo.autoRenewProductId` (DID_CHANGE_RENEWAL_PREF and later notifications) or,
  defensively, from a lower-rank transaction that does not extend the already paid period.
  `plan`/`status` are never changed by a preference: the entitlement follows the signed
  renewal transaction only.
- DTO: `SubscriptionDTO.pendingPlan` / `pendingAt`. Paywall shows
  "Pro actif · Essentiel à partir du <date>" and marks the pending plan card.
- Restore, rebind grants and Production ownership rules are untouched (existing tests pass).
