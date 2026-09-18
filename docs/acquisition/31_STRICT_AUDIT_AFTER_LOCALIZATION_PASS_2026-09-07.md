# Strict DEVISERA acquisition audit after the localization pass

Date: 7 September 2026  
Scope: repository code, tests and local build/export evidence only. No provider
account, production secret, ownership record or physical device was changed.

## Truthful score: 83 / 100

The score below is intentionally conservative. It includes a dedicated
localization/document category so the English product and regional document
work is visible rather than hidden inside general product quality. A passing
local build is not evidence of an accepted TestFlight binary, delivered email,
or legal compliance.

| Area | Score | Evidence and remaining gap |
| --- | ---: | --- |
| Product reliability and native UX | 21/22 | Query guards, one-tap press protection, recoverable loading/error states, client profile, route-title hygiene, haptics and mobile lint fixes are in the repository. A fresh binary and physical-device regression pass are still required. |
| English/French localization and regional documents | 14/14 | Mobile chrome, onboarding, quote creation, clients, leads, catalogue, analytics, account, subscription, errors and accessibility labels have English coverage. AI prompts/fallbacks, transcription, follow-ups, emails and FR/GB/US PDF labels/currency have regression tests. The mobile business profile now separates language from a France/UK/US business-region selector and adapts identifiers, tax labels and postal terminology. |
| Plans, teams and entitlements | 9/10 | Server-side plan, AI, seat and invitation limits are implemented and covered by unit tests. Full integration execution is pending an isolated PostgreSQL listener. |
| Privacy, deletion and export | 8/10 | Personal export, business export authorization, deletion/anonymization and retention-aware messaging are implemented. Production execution evidence and legal retention review remain outstanding. |
| Email and customer communications | 6/10 | Verification, welcome, reset, quote, lead and billing templates support French/English and provider rejection is surfaced instead of claiming delivery. Resend domain verification, delivery logs and a real inbox receipt are not available locally. |
| App Store, TestFlight and payments | 8/14 | StoreKit uses Apple’s localized product price, restore and management routes; subscription copy is localized. This pass intentionally created no new EAS build, so storefront availability, EUR/GBP/USD sandbox behavior, payment-sheet artwork, processing and device purchase flow remain unverified. |
| Infrastructure transferability | 8/10 | Runbooks, environment-name documentation, backup rehearsal notes and release/transfer checklists exist. GitHub, Vercel, EAS, Apple, Resend billing/ownership evidence and a production backup rehearsal still require owner records. |
| IP, legal and marketplace package | 9/10 | Acquisition data room, asset inventory, third-party/license audit, cost inventory, demo flow and handover checklist are organized and updated. Trademark/company ownership, contributor assignments, actual metrics and legal/accounting sign-off are owner evidence. |

## 95+ and 100

- **95/100 is not justified.** The missing points are real operational evidence:
  an isolated integration database run, production email delivery, a current
  TestFlight binary/device pass, Apple storefront/payment verification,
  production backup evidence and owner/legal records.
- **100/100 is not truthful.** A software acquisition needs sustained
  production evidence, account-transfer eligibility and legal/commercial
  diligence in addition to code quality.

## Work completed in this pass

- Finished the repository-side English mobile coverage and added a compatibility
  translation boundary for dynamic counters, API errors and accessibility text.
- Kept language separate from business country and localized AI, transcription,
  follow-ups, authentication/billing/lead emails and quote PDFs accordingly.
- Added FR/GB/US PDF terminology for quote/estimate, tax, company identifier,
  discount, exemption, currency and date formatting, with unit coverage.
- Resolved the Windows mobile ESLint EPERM traversal without widening the lint
  scope beyond the repository.
- Re-ran root/mobile TypeScript, root/mobile lint, 23-file/218-test unit suite,
  production web build, iOS Expo export and `git diff --check` successfully.

## Remaining classifications

### COMPLETE locally

- Code-side English/French mobile UI and localized AI/email/document paths.
- Persisted device language selection and mobile France/UK/US business-region controls.
- Server-side entitlement and account deletion/export implementations.
- Project-scoped lint reliability, typechecks, unit tests, web build and iOS
  JavaScript export.
- Acquisition documentation updates and old-brand search classification.

### BLOCKED BY EXTERNAL ACTION or host state

- Full integration tests: `127.0.0.1:5432` has no listener. PostgreSQL 17 is
  running on `127.0.0.1:5433`, but its credentials/database were not guessed or
  altered; an isolated test database is still required.
- Resend/DNS verification, provider logs and real inbox delivery.
- Git push, EAS production build/submission and App Store Connect processing in
  the current restricted session.
- Apple storefront/product availability, localized prices in a sandbox account,
  payment-sheet artwork and physical-iPhone performance/background checks.
- `npx expo-doctor` could not run offline because npm attempted a registry fetch
  and returned Windows `EACCES`.

### OWNER ACTION REQUIRED

1. Provision an isolated PostgreSQL database and run the suite with
   `TEST_DATABASE_URL` pointing to it (never production), or expose an isolated
   listener on port 5432 using the credentials already documented in the local
   test setup. Record the migration and test output.
2. In Resend, verify `devisera.fr`, publish the exact SPF/DKIM records it gives
   you, set `EMAIL_FROM="DEVISERA <contact@devisera.fr>"` and
   `EMAIL_REPLY_TO=contact@devisera.fr`, then send one verification and one
   quote email to a controlled inbox. Retain the provider event IDs privately.
3. From a clean checkout, push `codex/devisia-premium-fluidity`, run one
   production EAS iOS build using the existing `production` profile, submit it
   to TestFlight, and record the remote SHA, build number and processing state.
4. In App Store Connect, confirm French subscription localization/storefront,
   EUR pricing, three-day introductory offers and the DEVISERA artwork shown by
   Apple’s purchase sheet. Existing technical identifiers such as
   `fr.devisia.app` and `fr.devisia.*` must remain unchanged unless Apple
   migration planning proves a different identifier is safe.
5. Install that exact build on a real iPhone and run the auth, one-tap
   navigation, plus/client profile, subscription, language, poor-network,
   background/resume and email checklist in `15_RELIABILITY_AND_RECOVERY.md`.
6. Supply company/trademark ownership, contractor/IP assignments, current
   invoices/costs, real user/revenue metrics (or state that they are unknown),
   and obtain French/EU legal and accounting review before making compliance or
   commercial claims.

## Marketing truth

DEVISERA is now **technically buyer-prepared** at repository level and can be
demonstrated as a documented product with disclosed release gates. It should
not yet be marketed as fully production-ready, transferable or a turnkey
acquisition until the external actions above are completed and evidenced.
