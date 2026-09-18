# 14 · Verification ledger and readiness assessment

Assessment date: 6 September 2026. This is a first implementation/diligence pass, not an exhaustive security audit or a finished acquisition. Changes are local, not included in earlier TestFlight build 13 and not deployed to the public website.

This initial 55-point assessment is historical. Current evidence is in [15 Reliability and recovery](15_RELIABILITY_AND_RECOVERY.md) and [16 Release gates](16_RELEASE_AND_OWNER_ACTIONS.md). Do not interpret the original integration blocker or local-only status below as current.

## Updated checkpoint: 70 / 100 — NOT completion of the requested scope

6 September 2026, continuing pass. Judgment-based rubric, not certification or a target adjusted to satisfy a requested score.

| Dimension | Current score | Evidence and remaining limitation |
|---|---:|---|
| Product / verified flows | 22/30 | Client profiles, tap fixes, recovery and session-race guards implemented; 10 browser E2E checks passed. Native white-screen cause not reproduced; current device pass, production email and full localization remain open. |
| Engineering / reproducibility | 19/20 | 305 tests / 38 files, root type checks, prior root/mobile lint, working PostgreSQL and successful GitHub CI. Demo backup restored; production/full external-file recovery not established. |
| Documentation / asset clarity | 14/15 | Source-derived inventories, transfer/runbooks, versioned release gates and precise owner actions. Title evidence must still be supplied. |
| Operations / transferability | 8/15 | Backend deployments and TestFlight build 14 verified; build 15 submitted. Email unconfigured, hosting commercial-plan decision and first public Apple release outstanding. |
| Legal / privacy / IP | 5/15 | Allowlisted authenticated personal export implemented; dependency and visual-asset hashes collected. Deletion, retention, publisher identity and ownership assignments not complete. |
| Commercial evidence | 2/5 | Current public provider prices and actual Vercel Hobby tier verified. No reconciled revenue, complete invoices or verified customer metrics. |

**Not truthful to advertise as a turnkey acquisition yet.** A technically informed buyer can inspect the working product and evidence with the gaps disclosed. The 85–90 target has not been achieved. Unfinished engineering (notably complete mobile English, regional document snapshots and deletion execution) must not be relabelled as an owner-only blocker. Do not submit a public App Store release on the strength of this score.

The earlier ledger and 55-point allocation below are preserved as the baseline, not current results.

| Check | Result |
|---|---|
| Unit suite | COMPLETE: 194 tests across 20 files passed |
| Root production build | COMPLETE: Next compiled and generated pages; deprecation warnings for middleware and Prisma package config remain |
| Root TypeScript | COMPLETE via explicit check and final production build |
| Root ESLint | COMPLETE: final full lint passed |
| Mobile typecheck / lint | COMPLETE: passed after account support links |
| Production server smoke | COMPLETE: local server started; `/`, `/tarifs`, `/conditions`, `/confidentialite`, `/cookies`, `/connexion` returned 200; unauthenticated session returned 401 |
| Visual inspection | Homepage inspected in browser. Full responsive, authenticated, device and accessibility sweep NOT completed |
| Database integration | BLOCKED: local PostgreSQL migration/schema-engine setup failed; no integration cases executed. psql/docker not found on current PATH |
| E2E | NOT EXECUTED: same isolated database prerequisite; do not reuse production |
| Documentation | 13 subject documents, index, evidence inventory and this ledger created; local links and credential-pattern checks pass |
| License inventory | 1,615 lockfile instances; no missing license metadata. Not equivalent to cleared licensing or native binary audit |
| Secrets | Acquisition-folder heuristic scan found no credential patterns. Not a complete Git-history or secret-entropy scan |
| Runtime logs | Local startup/smoke output showed no runtime exceptions; not a complete client-console/production log audit |
| Git | Diff checked; changes scoped to package, safety guards, copy, support links and CI. No external ownership action |
| CI | Workflow added, not yet run by GitHub; pushing/branch protection remains separate |

## Judgment-based score: 55 / 100

| Dimension | Score | Reason |
|---|---:|---|
| Product / verified flows | 18/30 | Substantial implementation; device and live integrations incomplete |
| Engineering / reproducibility | 15/20 | Build/unit checks good; integration DB, restore drill and CI execution missing |
| Documentation / asset clarity | 13/15 | Organized technical package; ownership evidence incomplete |
| Operations / transferability | 5/15 | Provider dependencies documented; Apple eligibility and account evidence unresolved |
| Legal / privacy / IP | 3/15 | Pages and inventory present; deletion, retention, contracts and title gaps |
| Commercial evidence | 1/5 | Truthful worksheet; no verified metrics, invoices or valuation |

Suitable for an exploratory discussion with a technically informed buyer if gaps are disclosed. **Not ready to market as a fully turnkey, acquisition-ready business.** A polished package cannot substitute for operating evidence. Re-score after verified delivery/recovery, privacy implementation, legal/IP evidence, restored backups, full device rehearsal and provider transfer clearance.

Immediate owner inputs: legal operator identity and address; whether a product-owned domain/mailbox will replace agency contact; access to sender DNS/email setup; redacted invoices and reconciled production metrics; contributor/IP assignments; approved account/organization deletion and retention policy. Do not send passwords/API keys in conversation.
