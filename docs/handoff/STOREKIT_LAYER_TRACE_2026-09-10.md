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

## 7. Build 34 real-device feedback pass (same day)

### 7.1 "Passer à Pro" sent the customer Home — exact cause
`purchaseApplePlan` (`mobile/src/lib/apple-purchases.ts`) ran an entitlement preflight:
`getAvailablePurchases({ onlyIncludeActiveItemsIOS: true })` and, if ANY active DEVISERA
product existed, synced it and returned `'purchased'` without ever calling
`requestPurchase`. The paywall then refreshed the session, saw `nextStep === 'app'`, and
`router.replace('/(app)')`. "Already entitled" was being read as "nothing to buy".

Fix: the preflight still verifies every active item for this workspace first (ownership and
CONFLICT protection unchanged). Then:
- same product already active → `'reconciled'`, no StoreKit request (Flow A);
- a different product of the group → plan-change intent: `requestPurchase` for the TARGET
  sku (Flow B). StoreKit performs the upgrade/downgrade/crossgrade. A downgrade can come
  back as a transaction of the CURRENT product carrying the new renewal preference, so any
  DEVISERA product of the group settles the attempt. Backend `applyTransaction` then
  applies Apple's semantics (upgrade immediate; downgrade recorded as pending).

### 7.2 Navigation depends on where the action started
`ApplePaywall` now distinguishes `manage = router.canGoBack()` (pushed from Mon espace or
Paiements) from the entitlement gate (nothing behind). In the manage context no action
routes Home; a `PlanActionResult` card states the outcome (upgrade: "Pro est maintenant
actif"; downgrade: "Pro reste actif jusqu'au <date> · Essentiel prendra ensuite le relais";
restore: "Achats restaurés · Votre abonnement Pro est actif"; same plan: "déjà actif";
preference not yet signed: "Demande transmise à Apple"), with "Retour à mon atelier" and
"Rester ici". A downgrade waits up to ~8 s for Apple's signed renewal preference before
falling back to the "transmise" wording. The gate context keeps unlock → Home.

### 7.3 Swallowed spaces — exact cause
`app/devis/nouveau.tsx` bound the description `TextInput` to `composed`, computed as
`` `${description}${partial}`.trim() `` on every render. A controlled input whose value drops
the trailing space re-renders without it before the next key, so the space bar did nothing.
Fix: `features/description-input.ts` separates `displayedDescription` (exact typed text,
plus the dictation fragment only while listening) from `submittedDescription` (trimmed once
at submission). Dictation results are appended through `appendDictation`. Regression tests
type "Le client a refait toute la salle de bain" key by key and cover accents, apostrophes,
line breaks, punctuation, double/trailing spaces, deletions around spaces, and English.

### 7.4 EUR/USD: what changed in the pipeline
- New evidence from the device: Apple's own subscription-management sheet shows €39/€79/€149
  for the same account, so the catalogue knows the French prices; DEVISERA still received
  USD from `Product.products(for:)` through the wrapper, even after reload.
- `loadAppleProducts` now waits ~1.2 s and re-reads the storefront before its second
  catalogue request (session-initialisation race, case C), then, if the wrapper answer still
  contradicts the storefront, reads StoreKit 2 directly. If the direct answer IS consistent
  with the storefront, that answer is displayed (`NATIVE_METADATA_ADOPTED`) — Apple's
  dynamic `Product.displayPrice`, never a constant (case A). If the direct answer is also
  inconsistent, the placeholder stays and both answers are journaled (case B).
- Build 34 (production profile) cannot show the comparison. Build 35 is cut from this code
  with the `testflight-diagnostics` profile: long-press the paywall logo → "Comparer avec
  StoreKit en direct" → "Copier le rapport". The report lists, per product, wrapper price
  and currency, direct StoreKit price and currency, the catalogue `href` storefront and
  offer currency, intro-offer presence, and both storefront readings. No receipts, tokens
  or account data.

### 7.5 SubscriptionStoreView as a fallback — evaluation
`SubscriptionStoreView` (SwiftUI, iOS 17+) renders Apple's merchandising UI and loads prices
itself. It would require a host native module (SwiftUI in a UIViewController), takes over
the purchase call (our `appAccountToken` can still be injected through
`.subscriptionStoreControlStyle`/`purchaseOptions`), and the resulting transaction would
reach the backend through the existing `Transaction.updates` listener path. It cannot show
DEVISERA's plan cards, highlights or the downgrade sheet, and its price source is the same
`Product` API as ours; if `Product.products` is served for the wrong storefront, the view
displays the same wrong currency. Verdict: keep as a documented last resort only if Build 35
proves case B AND Apple cannot correct the catalogue answer. Not implemented.

### 7.6 Apple case 102957593166
Not updated by this session (no access to the case). The material to attach is §4, §5 and
the Build 35 comparison report once captured on the device.

## 8. Provenance check and France storefront fallback (Build 35 feedback)

### 8.1 Which build was tested
EAS records: Build 34 = `96b8a860`, profile `production`, commit `6ecc11f`; Build 35 =
`2318d0b5`, profile `testflight-diagnostics`, commit `c589119`, completed 11:43:55Z,
uploaded to Apple (submission FINISHED) 11:46:58Z. The reported symptoms — no diagnostics
entry, spaces swallowed, plan changes routing Home — are exactly Build 34's behaviour, and
the report was made ~4 minutes after Build 35 reached Apple, before TestFlight processing
completes. From now on the installed binary states its own provenance: Mon espace footer
and the support e-mail carry `DEVISERA · 1.0.0 (<build>) · <commit> · diagnostics?`, taken
from `EAS_BUILD_GIT_COMMIT_HASH` / `EAS_BUILD_PROFILE` at build time.

### 8.2 Diagnostics entry
In the `testflight-diagnostics` profile the paywall shows a visible "Diagnostic StoreKit ·
<build> · <commit>" pill under the logo (the 1.8 s long-press remains). The panel renders a
side-by-side table per product — WRAPPER (expo-iap): storefront, product, displayPrice,
currency; DIRECT STOREKIT 2: storefront, product, displayPrice, currency, verdict — plus
"Copier le rapport". Production builds render nothing.

### 8.3 France storefront fallback
`packages/shared/src/apple-storefront-prices.ts` is the single typed table
(storefront → product id → `{ displayPrice, currency, period }`), holding the prices Apple's
own subscription-management sheet displays for FRA: 39,00 € / 79,00 € / 149,00 €.
`appleOffer` returns `source: 'apple'` when the native metadata is coherent with the
storefront, `'storefront-fallback'` only for a known storefront + product when the metadata
contradicts it, `null` otherwise. No arithmetic, no conversion. The card notes "Tarif France
· Apple confirme le prix avant votre accord"; each use is journaled as
`STOREFRONT_FALLBACK_USED` with the contradicting native price and currency. When Apple
corrects the catalogue answer, `displayPrice` takes precedence automatically and the table
is no longer read. Trials are still announced only on coherent metadata.

### 8.4 Plan-change instrumentation
`path: 'plan-change'` events: `PREFLIGHT_SAME_PRODUCT`, `PLAN_CHANGE_REQUESTED` /
`FIRST_PURCHASE_REQUESTED` (currentProductId, targetProductId), `PURCHASE_INVOKED`,
`PURCHASE_SETTLED` / `PURCHASE_CANCELLED`; exported by the diagnostics report. Regression
matrix: Essential→Pro, Essential→Enterprise, Pro→Enterprise, Enterprise→Pro, Pro→Essential,
each asserting ownership verification before `requestPurchase` of the target sku.
