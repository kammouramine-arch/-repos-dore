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

- Final Production deployment/source alignment and live authenticated flows.
- Controlled inbox delivery: owner authorized four minimal DEVISERA tests to their Gmail inbox; no unrelated mail or secrets may be disclosed.
- Native purchase, restore, active-subscriber routing, photo persistence and final integrated motion on a physical iPhone.
- Production recovery/alert delivery, current service billing/ownership, App Privacy and buyer handover checks.
- Apple FRA/USD case remains a release acceptance blocker regardless of documentation.
