# StoreKit catalogue incident — Build 27

Build 27 (`1e17fe57ab311c3151f192a15de233f3e7001059`) completed Apple processing and is in the internal group. The owner's new screenshots show it is **not accepted**: no prices and a disabled purchase action. No subsequent build was started.

## Evidence

- App Store Connect group `22361541` matches the binary's three monthly product constants exactly. All are Prepare for Submission:
  - Essential: `fr.devisia.essentiel.monthly` — Apple ID `6808994981`.
  - Pro: `fr.devisia.pro.monthly` — `6808991416`.
  - Enterprise: `fr.devisia.entreprise.monthly` — `6808981897`.
- Bundle remains `fr.devisia.app`. No environment-specific product override or mock import exists in the native purchase module.
- Essential was reopened: France availability, EUR 39, free first 3 days, French name DEVISERA Essentiel. Apple login expired before reopening Pro/Enterprise prices. Earlier observations were EUR 79 / EUR 149; not a new verification. No prices, territories or immutable identifiers changed.
- Pinned SDK: expo-iap 5.5.0 / OpenIAP Apple 3.4.0, upstream commit `59fb640faa2ba831ffa040dc877b0b2c172145f6`. Native fetching directly calls `StoreKit.Product.products(for:)`; serialization uses `product.displayPrice` and `product.priceFormatStyle.currencyCode`. No DEVISERA price table is involved.
- **Confirmed code defect:** a separate storefront/currency disagreement caused a refetch followed by `STOREFRONT_METADATA_MISMATCH`, discarding successfully returned products and displaying the generic failure. Product diagnostics were recorded only after that guard. This reproducible path matches the screenshot, but is **not proof of the actual native device result**.
- Native return array, error and storefront remain unknown: screenshots do not contain them, and the owner could not obtain output from the existing share action. Do not assert zero products, invalid IDs or a native error code without evidence.

## Corrections

One shared in-flight catalogue query, no completed price cache; bounded requests and one bounded metadata refetch. A separate storefront snapshot disagreement is logged rather than used to discard current Apple products. No conversion, fabricated EUR amount or web/fallback price. If Apple still returns USD, French price acceptance remains failed, not solved by this change.

Empty/incomplete results are explicit failures. Diagnostics now capture requested/returned/missing IDs, duration, currency/display price, storefront and safe native code. Missing IDs are not labelled Apple's invalid IDs: this StoreKit API does not return a separate invalid-ID list. Retry is available after failure; failed cards no longer claim continuous loading. A false native initialization result is rejected and retryable.

The support action opens a selectable report before native sharing, including directly from the paywall error. No credentials, email, receipts, tokens or raw transaction IDs. Failure of the share sheet no longer hides the report.

Active backend entitlements bypass the catalogue. Startup/foreground reconciliation and manual restore use active purchases independently of product loading. Server verification and original-transaction ownership remain authoritative; no binding transferred or reset.

## Verification and remaining gate

426 tests / 62 files pass, including isolated PostgreSQL. Root/mobile TypeScript and lint pass; web build passes (68 routes); iOS export passes (1,436 modules). Mock SDK cases cover exact IDs, EUR refresh, mismatched snapshots, empty/native failure, concurrent loads, retry, restore despite catalogue failure and purchase lifecycle. These do not prove native purchase acceptance.

Before release acceptance: real device must display current Apple prices matching the native sheet, enable purchase, handle cancel/retry, verify purchase on the server and reach Home without restart. Repeat restore/login on the subscription-owning DEVISERA account. Ownership confirmation/reset approval remains outstanding. App Store reauthentication is needed to finish the Pro/Enterprise/agreements recheck.

Sources: https://developer.apple.com/documentation/storekit/product ; https://developer.apple.com/documentation/storekit/storefront/updates ; https://github.com/hyodotdev/openiap/tree/3.4.0/packages/apple
