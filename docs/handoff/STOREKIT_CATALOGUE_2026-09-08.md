# StoreKit catalogue incident — Build 27

Build 27 (`1e17fe57ab311c3151f192a15de233f3e7001059`) completed Apple processing and is in the internal group. The owner's new screenshots show it is **not accepted**: no prices and a disabled purchase action. No subsequent build was started.

## Evidence

- App Store Connect group `22361541` matches the binary's three monthly product constants exactly. All are Prepare for Submission:
  - Essential: `fr.devisia.essentiel.monthly` — Apple ID `6808994981`.
  - Pro: `fr.devisia.pro.monthly` — `6808991416`.
  - Enterprise: `fr.devisia.entreprise.monthly` — `6808981897`.
- Bundle remains `fr.devisia.app`. No environment-specific product override or mock import exists in the native purchase module.
- Live authenticated configuration check completed September 8: Essential EUR 39, Pro EUR 79, Enterprise EUR 149 per month. Each current-pricing table, filtered to countries selected for availability, shows France and free first 3 days. Each product has 1/175 territories enabled (France only); UK/US are not enabled. French customer names are DEVISERA Essentiel, DEVISERA Pro and DEVISERA Entreprise. No prices, territories or immutable identifiers changed.
- Group `22361541`: Enterprise level 1, Pro level 2, Essential level 3, all one month and Prepare for Submission. French group display name and app name are both DEVISERA. Historical internal reference names remain DEVISIA. Public submission is not complete; that status alone does not establish the TestFlight catalogue failure, particularly given the earlier successful native purchase.
- Live Business check: Paid Apps Agreement and Free Apps Agreement Active; banking and submitted tax forms Active; DSA Active. DAC7 has Missing Info and requires the owner's factual information. No agreement accepted or financial/legal information edited. No evidence establishes DAC7 as the cause of this incident.
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

Before release acceptance: real device must display current Apple prices matching the native sheet, enable purchase, handle cancel/retry, verify purchase on the server and reach Home without restart. Repeat restore/login on the subscription-owning DEVISERA account. Ownership confirmation/reset approval remains outstanding. The live configuration audit is complete: it found no ID, French availability, price or inactive-agreement explanation for the failure. Actual native return values and storefront remain unknown; do not claim a confirmed zero-product response or a proven device root cause. The confirmed application rejection path is corrected in code commit `c0dab33328de1758f86302fa58f311d4e8ef6e01`, not in Build 27. No new build was created during this audit.

Sources: https://developer.apple.com/documentation/storekit/product ; https://developer.apple.com/documentation/storekit/storefront/updates ; https://github.com/hyodotdev/openiap/tree/3.4.0/packages/apple
