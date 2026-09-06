# Release gates and owner actions

Verified 6 September 2026 against the authenticated App Store Connect and Vercel accounts. This is a release preparation record, not Apple approval or a compliance opinion.

## Deployment evidence

- Production: `dpl_BpkqEKo4EgsSDo78QeKr3HGYvmiM`, alias `https://devisia-bice.vercel.app`, ready. Public home/pricing/terms/privacy returned 200. Personal export and client-profile endpoints returned 401 without authentication. These checks do not prove authenticated production flows or email delivery.
- GitHub quality checks for `f4e036976001b3fa56dc877b3e041658661fb7f2`: runs `34038216875` and `34038213679` both succeeded, including the isolated PostgreSQL suite and mobile checks.
- iOS 1.0.0 (14): Expo build `358ba49f-72a3-4209-94ea-215dbb5adc37` finished; Apple build `7540eb74-a2b8-4725-8fbf-dbf43df9ad84` upload complete and assigned to **DEVISIA Internal**, one invite. Verified in App Store Connect. “Ready to Submit” on the TestFlight list is not a public App Store release.
- Build 14 contains the initial client profile, tap/creation recovery, export and diagnostics changes.
- **Build 15 verified available**: Expo `6e6a6474-255a-4db3-a44c-296d6df7b45a`, successful submission `3c689215-f17d-4f80-99bb-ededec975f5b`, Apple `71eadcf2-ce20-4f19-86ea-8eb72725f93a`. Upload complete at 16:55 Paris and assigned to DEVISIA Internal with one invite. Contains client timeline/jobs and old-session 401 guards. No real-device installation/acceptance result recorded yet.

## Observed App Store production blockers

App Store Connect → DEVISIA → Distribution → iOS 1.0, inspected 6 September:

1. Version remains **Prepare for Submission**; no released version verified. Build **11**, not the latest tested build, remains attached to the production draft.
2. French listing has **0 screenshots**, blank description, keywords, support URL and copyright. Promotional text and marketing URL are also blank, but must not be represented as mandatory solely because the fields exist.
3. App Review has sign-in required but no reviewer username/password and no review contact name/phone/email. Supply a working, controlled review account; never commit its credentials.
4. App Privacy has no privacy-policy URL and its data-collection questionnaire has not been started. The existing public policy still lacks confirmed publisher identity. Do not submit a false “no data collected” declaration.
5. First subscriptions must be submitted with an app version. Confirm the three subscription products, review assets and current three-day introductory offers in the final submission; TestFlight purchases are not product approval.
6. Production sandbox entitlement acceptance remains enabled for TestFlight. Disable the production sandbox bypass and verify production receipt handling before public release, while preserving an appropriate test environment.
7. Current in-app account deletion is a support contact, not a complete deletion feature. Apple's guidance requires in-app initiation, actual deletion of data not legally retained, clear timing and completion confirmation. This is a technical release gate, not only paperwork.
8. Production email sending and email-code verification have no configured production provider. A successful local mocked test is not inbox delivery.
9. Physical-device acceptance remains outstanding for build 14: + tap, client row with keyboard open, rapid tabs, cold start/resume, poor network, purchase sheet branding and purchase completion.
10. Final legal identity, trader information, age/content questionnaire, pricing/availability and relevant contractual status need final owner verification. Do not infer these are complete from a successful build upload.

The draft currently uses automatic release after approval. Confirm the desired release mode before submitting. No review submission or public release was performed in this pass.

Apple references: [transfer criteria](https://developer.apple.com/help/app-store-connect/transfer-an-app/app-transfer-criteria/), [account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/). Transfer eligibility must be rechecked at sale: a released version is a prerequisite, not the only criterion.

## Exact owner actions

### Email — BLOCKED BY EXTERNAL ACTION

1. Sign in to the Resend account intended to operate DEVISIA; the browser is open at its login page. Do not send passwords or API keys in chat.
2. Sign in to the DNS provider controlling `amyn.agency`. Confirm authority to send as `contact@amyn.agency` and whether the domain/sender will be included in a sale or replaced.
3. Once access is available, add only Resend's exact domain-verification records, preserving existing mail/MX records. Verify the domain; configure provider credentials privately in Vercel Production; redeploy.
4. Send a controlled quote and confirmation code to an owner-approved test inbox. Verify Resend delivery status and actual inbox receipt; verify the application does not mark a failed send as delivered. Record message IDs, not private email contents, in restricted evidence.
5. Enable mandatory signup verification only after successful delivery and a recovery procedure. Do not lock existing users out while delivery is unconfigured.

### Commercial hosting — REQUIRES OWNER DECISION

Vercel account metadata shows Hobby/active/USD. Hobby is for non-commercial use. Before paid launch, open Vercel → team `amyn1` → Settings → Billing and choose/approve a suitable commercial plan. No paid upgrade was purchased. Record the resulting invoice, limits and billing owner privately.

### Privacy and deletion — REQUIRES LEGAL/ACCOUNTING REVIEW

Provide the publisher's legal name, legal form, registration details and business contact address. Have a qualified adviser specify retention by record category (account, quotes/invoices, payment records, AI inputs/files, logs, backups) and treatment of shared-company records when its last owner leaves. App engineering must then implement and verify deletion/anonymization, subscription warnings and confirmation; retaining every record indefinitely or merely disabling login is not completion.

### Store review — BLOCKED BY EXTERNAL ACTION

Provide accurate legal copyright owner and a reachable review contact phone/email. Create a controlled review account that can demonstrate quote creation without purchasing a personal subscription. After real-device QA, capture real screenshots, attach the approved build and first subscriptions, review privacy answers and deliberately submit. Do not supply a fabricated screenshot or reviewer login.

### IP, costs and handover — REQUIRES OWNER DECISION

Supply contractor assignments/invoices where applicable, original brand/design provenance, domain ownership evidence, current provider invoices and verified user/revenue figures. Place sensitive originals in a restricted data room, not Git. Unknown revenue remains unknown. Select encrypted backup storage and a custodian; approve retention before a production backup.

## International release scope

France remains the current business/document profile. Shared language/country/currency helpers are implemented and tested, but mobile English, localized AI/fallbacks/emails/PDFs and historical document currency snapshots are unfinished. Do not market native English or UK/US legal readiness yet. Never change existing quote amounts from EUR to GBP/USD by merely changing a display preference.

## Acceptance budgets, not claimed measurements

- One tap: visible pressed feedback on the next rendered frame; destination chrome/loading state target within 100 ms for local navigation on the chosen reference iPhone.
- Cached client/dashboard open: target meaningful cached content within 200 ms; refresh in the background without replacing content with white screens.
- Record 10 cold starts, 20 warm navigations and 10 keyboard-open client taps on a named iPhone/iOS/build, reporting median and worst result. Record network conditions separately.
- Any blank screen, required second tap, stale-account data or forced restart is a release failure even if the average timing is good.
- No measured physical-device timings exist for this pass. Bundle-size reduction and passing browser tests are not substitutes.
