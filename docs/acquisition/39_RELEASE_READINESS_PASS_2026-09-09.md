# Release readiness evidence — 9 September 2026

This is an execution ledger, not a production-ready declaration. Baseline score: 64/100.
Apple case 102957593166 (FRA storefront / USD metadata) remains external and was not reinvestigated.

## Confirmed changes and checks

- Starting local and remote integration HEAD: `53b1c4c8c9b8231a368a04d99ffa8685252902c9`.
- Reproduced Windows Playwright hang: a passing test reaches `Terminating the WebServer` and never exits. The previous nested shell/npx lifecycle relied on Windows process-tree termination.
- Replaced that lifecycle with an owned Node child and private IPC shutdown invoking Next's cleanup. No network shutdown endpoint, global process kill, or increased indefinite timeout. Failure to exit within 15 seconds fails the run.
- Full browser suite then **14/14 passed, exit 0**, including production web compilation, two viewport projects, legal routes, 40 repeated unauthorized API requests and safe health provenance. This is Chromium, not native iPhone QA.
- Full unit/integration suite **478/478, 70 files, exit 0**, using isolated PostgreSQL 17 at loopback port 55432. No production database was used.
- Root/mobile TypeScript and lint passed. Final reruns after remaining edits are still required.
- `/api/health` now reports only a validated 40-character release commit, or null; arbitrary environment values and raw dependency exceptions are not exposed.
- Hosted migrations now identify a missing/invalid database variable without printing its value. No Production secrets were copied into Preview.
- CI includes browser tests/production build and normal-profile iOS export, beyond the existing unit/type/lint checks. Remote execution remains to be observed.

## Deployment configuration evidence

Authenticated Vercel showed Production at `de699d3`, while the integrated branch was Preview. Production tracking was still `claude/devisia-saas-build-4wthv7`.
Changed tracking to `integration/devisera-final`; Vercel confirmed “Branch tracking saved”. Existing Production environment secrets and automatic custom-domain assignment were preserved.
The new source is not considered deployed until the resulting Production deployment and alias health commit are checked.

Follow-up: commit `d057608f849f791ccde3aa269c11a632a28631fc` was pushed and the live `https://devisera.fr/api/health` returned that exact commit, HTTP 200, database OK, Resend configured. Legal pages returned 200 and unauthenticated session/payments returned 401 with no mitigation header. Subsequent dependency/support edits require another deployment verification.

## Fresh dependency advisory audit

- Found installed sharp 0.35.3 affected by [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). Updated to **0.35.4**, runtime confirms **libheif 1.23.2**.
- Updated root/mobile js-yaml **4.3.1 → 4.3.2**, addressing [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh).
- Root dependency installation audit now reports zero advisories. Mobile still reports decode-uri-component's version advisory chain (three moderate entries); the committed patch already bypasses the vulnerable recursive malformed-input decoder and is installed. Regression covers 60,000 malformed characters and valid localized decoding. Do not claim the npm advisory count is zero or downgrade Expo Router to satisfy it. Upstream 0.5.0 is ESM whereas the current query-string consumer uses CommonJS; preserve tested compatibility until a compatible upstream migration.
- Full unit/database rerun after patches: **478/478 passed**, 70 files, exit 0.
- Added `/assistance` with French/English account, subscription, recovery and privacy assistance using the confirmed support email. No app redesign.

## App Store and hosting quote

- App Store Connect's Privacy Policy URL was empty; saved `https://devisera.fr/confidentialite` and verified it persisted. Privacy categories are being prepared as an unpublished draft; no public submission or completed compliance claim.
- Public-release draft has zero screenshots and an empty support URL; these are not satisfied by TestFlight upload.
- Vercel checkout quoted **USD 20 immediately, USD 20/month**, applicable tax and usage additional; 1M CDN requests included, next tier +USD20/month. Scope is the **whole AMYN team**, not one project. Owner excluded unrelated upgrades, so scope confirmation was requested. No purchase/card entry/add-on was made. The alert upgrade first opened Observability Plus (USD1.20/million events); dismissed without purchase.

## Firewall and monitoring

Authenticated settings: no custom rules, no IP blocks, no system bypasses, Bot Protection Off, AI Bots Allow, Attack Mode not enabled. Vercel system mitigations remain active. Overview had denied/challenged traffic; this is not proof those were legitimate mobile requests. No broad security reduction was made.
Built-in anomaly alert page requires Pro. Current team is Hobby. No alert-delivery claim or paid upgrade has been made.
[Vercel terms](https://vercel.com/legal/terms) restrict Hobby to personal/non-commercial use; commercial hosting plan is an owner decision.

## Isolated recovery rehearsal

Backed up local fixture database with `scripts/database-backup.mjs`, verified SHA-256, restored into a new loopback-only `devisera_release_restore_test` database with no `--clean`. All **35 table counts matched**. Archives are git-ignored under output/backups.
This proves local mechanism and structural/count recovery, not production RPO/RTO, production backup retention, external object recovery, or a production rollback drill.

## Publisher facts and legal limits

Owner confirms individual/natural-person publisher **Kammour Amine**, explicitly authorized for publication as publisher and publication director; no separate DEVISERA company, no supplied SIREN/SIRET/VAT, and `contact@devisera.fr` as legal/privacy contact. Publishable business/domiciliation address is explicitly blocked pending professional advice; no home address may be inferred or published.
Legal notice reflects those facts without claiming exemption from registration/VAT. Vercel hosting and public provider address verified from [Vercel DPA](https://vercel.com/legal/dpa). Privacy text now reflects profile photos, subscription identifiers, account export/deletion and retained business records.
Professional review is still needed for registration, publication address, taxes, retention, processor terms, transfers, consumer/subscription wording and complete commercial notices. See [official professional-site guidance](https://entreprendre.service-public.gouv.fr/vosdroits/F23455).

## Pending evidence — do not award completion points

### Owner spending decision (supersedes the earlier quote request)

On 9 September the owner explicitly refused **all paid service purchases/upgrades**. Keep Vercel AMYN on Hobby and Supabase on Free. Do not create a paid team, enable an add-on, start billable builds, or migrate hosting without separate approval. Vercel checkout was dismissed; no purchase was made. This is an **owner/commercial-hosting launch blocker**, not permission to misrepresent commercial use as personal use.

The hosting eligibility deduction belongs to backend/operational release readiness, once. Do not deduct UI, auth, localization or security implementation points merely because the owner declined Pro. Backup reliability and alert delivery remain separate evidence gaps, but they do not inherently require paid products: approved self-managed encrypted backups and a verified free alert service could satisfy them.

See `40_FREE_HOSTING_ASSESSMENT_2026-09-09.md` for a commercial-use-permitted free candidate and unverified migration gates. No migration has occurred.

### Additional completed no-cost evidence

- Production alias health returned **db72641f5f811cbaf19f95ed4942fb60d5b2f1bd**, HTTP 200/database OK. English `/assistance?lang=en` also returned 200 with English support content and the confirmed support email.
- Independent detached worktree at db72641 installed root and mobile dependencies from lockfiles without production secrets; all six migrations applied to a new loopback-only database. Fresh worktree unit/integration rerun: **478/478, 70 files, exit 0**, 42.41 seconds. Browser rehearsal's last-run artifact reports passed; its lost console output is not counted as a separately proven clean exit.
- App Store Connect App Privacy now has all **15 selected data categories configured in an unpublished draft**, including actual linked Product Interaction analytics and Other Diagnostic Data. No advertising tracking declared. This remains subject to the processor/legal review; Publish was not clicked.
- App Store support URL set to the live `https://devisera.fr/assistance`. Public screenshots/review credentials and public-release approval remain outstanding.
- Authenticated Supabase dashboard showed the DEVISIA project on **Free**, AWS eu-west-1, with no managed project backups. No upgrade made. The prior local restore is not a substitute for approved production backup custody/retention.
- Expo Billing showed an **existing Starter subscription**, $19/month, with $20 of $45 build credit used. This was not created or changed by this pass. No build or additional charge was initiated after the owner's no-spending instruction.
- Removed raw database exceptions from best-effort analytics logging; a fixed `write_failed` category remains. Two regression tests prove event persistence and error non-disclosure.
- Final code suite: **480/480 tests, 71 files**, root/mobile TypeScript and lint pass; production web build and **14/14 browser cases pass with exit 0**, 46.1 seconds, zero flaky/skipped cases. Production-profile iOS export passed (1,444 modules, 24 assets). This is export validation, not a signed iPhone build.
- Controlled production signup, explicitly approved by owner, created one labelled disposable QA workspace and one sample recipient. Gmail received verification and welcome messages at **16:35 Europe/Paris on 9 September**; sender **DEVISERA <contact@devisera.fr>**, Reply-To **contact@devisera.fr** confirmed. Invalid code was rejected; the delivered code validated and routed to the web app. Logout returned to login; wrong password stayed on login with the correct error. No codes/passwords stored in this ledger.
- Quote composer requires AI generation on this web path. It was not invoked while billing impact remains unknown under the no-spending instruction. Quote/follow-up/Team inbox delivery is not claimed from verification-mail success. No paid subscription was activated and no existing Apple ownership binding was modified.

- Final Production deployment/source alignment and live authenticated flows.
- Controlled inbox delivery: owner authorized four minimal DEVISERA tests to their Gmail inbox; no unrelated mail or secrets may be disclosed.
- Native purchase, restore, active-subscriber routing, photo persistence and final integrated motion on a physical iPhone.
- Production recovery/alert delivery, current service billing/ownership, App Privacy and buyer handover checks.
- Apple FRA/USD case remains a release acceptance blocker regardless of documentation.
