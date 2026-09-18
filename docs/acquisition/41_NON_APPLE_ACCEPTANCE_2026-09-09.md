# Non-Apple release acceptance — 9 September 2026

Starting production: d549a669a50967ffadfca673ed15893674a3fdff. Authentication evidence from the preceding pass is preserved, not repeated. Apple case 102957593166 and commercial hosting remain external. No paid upgrade, public submission or iOS build authorized in this pass.

## Real controlled email evidence

One labelled QA workspace and zero-value quote DEV-2026-0001; no real service or payment commitment. Controlled inbox approved by owner. No passwords, codes or public access tokens retained here.

- Quote: received in Gmail inbox at 17:11 Europe/Paris. Subject `Votre devis DEV-2026-0001 — DEVISERA QA 2026-09-09 disposable`; French test content, one PDF attachment, DEVISERA sender `contact@devisera.fr`, signed by devisera.fr, mailed by rsend.devisera.fr, TLS. Reply-To is the QA business contact address, as intended for customer replies.
- Follow-up: received in Gmail inbox at 17:14; subject `TEST DEVISERA — relance technique sans engagement`, exact controlled French message, same sender/domain and QA business Reply-To. Initial alias search did not refresh immediately; subject search verified receipt. No second follow-up sent.
- Team: controlled Essential workspace has 1/1 seats. Owner identified contact@amyn.agency as the workspace to use; authenticated session requested. Do not bypass billing or change plan to make a test pass.
- Found canonical APP_URL still set to the legacy Vercel domain. Changed Production APP_URL only to https://devisera.fr; Vercel confirmed save, requiring redeployment. Existing old links remain routable. No mobile API identity, DNS, mail or secret changes.
- Found French quote email promising acceptance although public page only supports viewing/contact. Corrected FR/EN CTA to viewing only.
- Added manual web quote creation using existing editor, no AI request. Desktop and mobile-browser journey assertions pass. The ordinary follow-up preparation UI invokes the existing configured AI provider; no new paid plan was enabled. Its marginal billing is not independently verified.

## Security and firewall evidence

- Seven read-only unauthenticated production API checks (session, payments, avatar, personal export, organization export, customers, quotes) returned 401, without x-vercel-mitigated. No destructive production negative tests.
- Vercel Traffic, past day ending 17:08: 736 denied, 56 challenged; DDoS mitigation, zero custom rules. Denied paths include .env variants, AWS credentials, Git config and PHP probes. Visible API-path results showed /api/.env. This aggregate/top-path view is not proof every legitimate iPhone request was allowed; no broad exception or security weakening made.
- Raw exceptions found in audit/AI/email-notification/PDF/push service logging. Replaced with allowlisted categories, excluding messages/stacks/causes/provider bodies. Anthropic logs retain numeric HTTP status only.
- Follow-up persistence previously ignored the provider's delivered=false result. It now refuses success and quota consumption without acceptance; Resend itself must return a message ID. Inbox receipt remains separate from provider acceptance.

## Verification so far (not final readiness)

- Manual quote change: root TypeScript/lint and production web build passed; 16/16 browser cases, exit 0, 49.6 seconds.
- Subsequent security/email changes: 487 tests / 74 files passed, exit 0; final rerun after all changes still required.
- Production backup location/retention requires owner decision before copying customer data. Existing local restore evidence is not a production backup.

## Remaining acceptance

Team inbox, final canonical-link deployment, current App Store draft fields, alert receipt, approved recovery custody, final full suite and strict category rescore remain in progress. Do not score this ledger as completed behavior.
