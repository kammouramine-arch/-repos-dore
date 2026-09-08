# DEVISERA — current production evidence, 8 September 2026

This record supersedes earlier optimistic completion statements. A passing automated test is not proof of a physical StoreKit purchase or legal compliance.

## Changes in this pass

- Live inspection found `email_challenges` and `file_blobs` readable by Supabase public roles without RLS. Enabled RLS on both, without policies or data deletion, matching the server-only Prisma architecture. Added a repeatable migration and PostgreSQL regression test. All other public tables already had RLS; no public policies were present. Historical exposure requires professional security/privacy assessment; absence of observed abuse is not proof none occurred.
- Startup recovery now awaits the actual session refresh and catches rejected retries.
- Live web signup delivered a code but the website had no code input. Added code confirmation, bounded requests, resend cooldown and server-authoritative continuation. Mobile verification remains unchanged.
- Scoped Prisma configuration dependency update removes the deepmerge-ts advisory. Xcode UUID dependency updated without an SDK downgrade. Patched malformed URI decoding to preserve rejected input rather than execute the vulnerable recursive fallback; valid UTF-8 remains unchanged. The package scanner still reports the decoder version and its two dependants because patch-package does not change version metadata. Regression tests exercise malformed input and native project UUID generation.
- Refreshed acquisition inventories and removed an embedded local-test connection credential from an old report. No production credential was exposed by that report.
- App Store Connect French name saved as DEVISERA, subtitle saved, Business category selected. Immutable identifiers retained.

## Evidence obtained

- Full automated suite: 418 tests / 61 files, including isolated PostgreSQL on localhost:55432, auth, Apple reconciliation/ownership, entitlements, workspace isolation, deletion/export, localization and billing. Apple signature decoding/native StoreKit are mocked where required: this is not a real-device purchase acceptance.
- Root and mobile TypeScript/lint passed; production web build generated 68 routes; iOS Expo export succeeded, 1,435 modules, approximately 3.4 MB.
- Backup/restore rehearsal: custom archive/checksum created from isolated test DB, restored to a separate empty local `readiness_restore_test`, 35 public tables restored. This does not prove production RPO/RTO or a scheduled production backup.
- Resend: devisera.fr verified; recent verification and welcome messages marked Delivered. Recipient-server delivery is not an inbox-placement guarantee. Quote/follow-up/invitation live delivery still requires controlled end-to-end evidence.
- Existing EAS build 26 is from 8f515f0 and predates 22dda4a access reconciliation. It must not be treated as the final code.
- Production previously deployed 22dda4a successfully. Current release identifiers will be recorded after deployment.

## Material gates that cannot be signed off by code tests

1. Apple original transaction ownership: one existing Sandbox binding was found. Its owner was disclosed privately to the owner; not copied into buyer documentation. No binding transferred or reset. Need explicit confirmation of intended account and authorization before any reset. Reusing one Apple purchase account across DEVISERA workspaces is intentionally rejected.
2. Physical iPhone: current localized StoreKit prices, purchase → server verified entitlement → Home, cancellation, restore, rapid navigation, keyboard/back, cold-start animation, background/resume, microphone/voice and poor network require acceptance on the new build.
3. App Store: no released version; products Prepare for Submission; France availability verified previously, UK/US launch not enabled. Publisher trader status currently non-trader, age/content-rights/privacy/review assets need truthful completion. Do not submit public review or attest ownership/legal identity without owner input.
4. Legal notices still lack confirmed publisher identity and professional review. Supply legal name/form, business address, registration number when applicable and publication director. Counsel must assess privacy disclosures, processor agreements, retention, incident obligations, consumer/trial/cancellation terms, regional documents and IP title.
5. Vercel Hobby commercial-use suitability and production backup service require owner purchasing decisions. Supabase Free is the observed database tier. Do not claim paid production resilience or verified actual monthly invoices.
6. Domain, source/asset assignments, native binary third-party notices, actual invoices and transfer eligibility need owner evidence. Historical technical names are not customer brands and must not be renamed blindly.

## Physical acceptance record to complete

Record build number, iOS version, language, storefront, network and diagnostic reference (never tokens/codes/receipts). Fresh install → signup → code received → invalid code rejected → valid code → paywall. Verified login must not send email. Use the subscription-owning DEVISERA login; confirm Apple price matches the native sheet, cancel cleanly, purchase/restore updates server nextStep to app without restart. Logout/login and background/resume must preserve correct access. Test English/French, Clients, +, Teams, account/back, support, rating, billing and legal links. Repeat on poor network and rapid taps. Any failure remains a release blocker.
