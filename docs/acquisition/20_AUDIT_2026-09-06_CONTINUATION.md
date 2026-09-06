# Strict acquisition-readiness audit — continuation, 6 September 2026

This score is deliberately conservative. It measures repository evidence and the external release state that can be verified today. It is not a legal opinion, App Store approval, or proof of real-device behavior.

## Score: 71 / 100

| Area | Score | Evidence / limitation |
|---|---:|---|
| Product stability and core flows | 18/22 | Root/mobile TypeScript, lint, and unit checks pass. Creation route, client profile, deletion/export code and recoverable route boundaries exist. Native cold-start, StoreKit and the original blank-screen report still require device evidence. |
| Performance and responsiveness | 5/9 | Tab/startup diagnostics are bounded and shareable without PII. No valid iPhone timing set or frame-rate measurement has been recorded, so no performance percentage is claimed. |
| Client navigation/profile | 4/4 | Profile, history/timeline, one-tap row navigation and race guards are implemented; device acceptance remains outstanding. |
| Onboarding | 4/4 | Five-slide onboarding and single plan-selection path are implemented. |
| Subscription/payment | 3/7 | Apple product mapping, restore path and three-day offer copy exist. Native purchase/restore completion, storefront currency and payment-sheet branding are not verified on the current candidate. |
| Production email | 0/5 | Resend sender/DNS verification and an inbox delivery proof are still absent. |
| English/localized AI/email/documents | 8/12 | AI prompts and deterministic responses, customer emails/follow-ups, regional PDF labels/currency, and persisted language preference are implemented and unit-tested. The mobile surface is not fully translated and visual PDF fixtures are not complete. |
| France/UK/USA regional handling | 3/4 | Language is separated from country; France/GB/US labels, money and date behavior are covered in shared helpers and PDF rendering. Quote-time legal snapshots and jurisdiction-specific review remain open. |
| Account deletion and business export | 6/6 | Authenticated export and password-confirmed personal deletion are implemented; the integration test exists. Execution still needs PostgreSQL. Business records are intentionally retained pending retention/legal policy. |
| App Store/TestFlight/release | 4/8 | A prior production EAS/TestFlight candidate exists, but the latest local commits are not in that build. The new EAS attempt could not run because the environment could not fetch `eas-cli`; no new build is claimed. No public release/Apple approval is verified. |
| Infrastructure, IP, costs and handover docs | 16/19 | Acquisition package and inventories exist. External account ownership, invoices, backup restore evidence, publisher identity and legal/IP proofs still require owner evidence or specialist review. |

## Truthful conclusions

- **95/100 or higher:** No.
- **100/100:** No; that would be misleading.
- **Production-ready:** Not for a public paid launch yet. The repository is materially stronger, but email, release and device gates are open.
- **Buyer-ready:** Yes for a disclosed technical diligence conversation, not as a turnkey operating business.
- **Transferable:** The source and documentation are structured for transfer; external accounts and the released App Store state are not yet transferred/verified.
- **Turnkey acquisition:** No.
- **Would I show it to a serious buyer today?** Yes, with the score and blockers disclosed. I would not describe it as fully turnkey.

## What changed since 66/100

- Added localized AI system directives and English deterministic assistant fallbacks.
- Added English/regional customer quote emails and follow-ups.
- Added French/GB/US PDF terminology, currency and date behavior, with unit assertions for QUOTE versus ESTIMATE.
- Added a persisted mobile Français/English preference using the existing authenticated endpoint.
- Added deletion/export integration coverage and bounded startup diagnostics.
- Root typecheck, mobile typecheck and lint pass; unit suite is 22 files / 211 tests.

## Remaining work classification

### Technically fixable in the repository

- Complete the mobile English copy pass across all screens and error states; the current scan still finds several hundred French strings.
- Add quote-time regional/legal snapshots and visual FR/GB/US PDF fixtures.
- Execute the new deletion/export integration tests once a safe PostgreSQL test database is available.
- Add automated native purchase-state tests where StoreKit mocks are supported, then perform device acceptance.

### Blocked by external services or environment

- GitHub push from this environment is blocked at `github.com:443`; the connector confirms the remote branch is still identical to `4847fc8`.
- EAS CLI could not be fetched from `registry.npmjs.org` (`EACCES`/network), so no new build or submission was started.
- Resend sender/DNS and inbox delivery.
- Apple processing, TestFlight installation, storefront currency, payment sheet and App Store public release.
- Local PostgreSQL listener for the integration suite.

### Exact owner actions

1. From the DEVISERA repository directory, run `git push origin codex/devisia-premium-fluidity` and verify the remote head reaches `e6a2058336d7551169ded537ba2596a4effb1481`. This preserves all existing commits; do not cherry-pick or recreate them.
2. From `mobile`, run `npx eas-cli build --platform ios --profile production --auto-submit --non-interactive --no-wait` after installing/authorizing the existing EAS CLI. Record the build and submission URLs.
3. Complete Resend domain/sender verification for `contact@devisera.fr`, add the DNS records Resend supplies, send a real quote to a controlled inbox, and capture provider delivery plus inbox receipt.
4. Start a disposable PostgreSQL test database, set the test `DATABASE_URL`/`DIRECT_URL`, run `npm test`, and retain the results. Do not point tests at production.
5. Install the resulting TestFlight build on the named iPhone and run the QA checklist in `docs/acquisition/16_RELEASE_AND_OWNER_ACTIONS.md`, including cold start, +, client tap, poor network, language, purchase/restore, camera/photo and background/resume.

### Legal/accounting review

- Confirm retention/deletion rules for quotes, invoices, payment records, files, AI inputs, audit logs and backups in France/UK/US.
- Confirm publisher identity, IP assignments, brand/domain ownership, third-party asset licenses and App Store privacy disclosures.
- Confirm tax/VAT/TVA document wording for each target country before marketing regional PDFs as compliant.

## Evidence boundary

No secrets or customer data are included. The two pre-existing working-tree entries `NEXT-PASS.md` and root `eas.json` were not modified or staged by this continuation.
