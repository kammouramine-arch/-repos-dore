# DEVISERA · Acquisition data room

Prepared 6 September 2026. Confidential working material; not a sale offer, legal opinion or warranty. Source inspection and earlier device reports establish implementation, not complete production reliability. No ownership transfer was performed.

## Start here

Read the [product and readiness register](01_PRODUCT_OVERVIEW.md), [asset schedule](02_ASSET_INVENTORY.md) and [closing checklist](11_TRANSFER_CHECKLIST.md) first. Each claim must be backed by source, a current account record, a test, or an owner-supplied document. Unknown traction is **unknown**, not zero.

| Document | Purpose |
|---|---|
| [01 Product](01_PRODUCT_OVERVIEW.md) | Scope, gaps and acceptance gates |
| [02 Assets](02_ASSET_INVENTORY.md) | Proposed inclusions and exclusions |
| [03 Architecture](03_TECHNICAL_ARCHITECTURE.md) | Developer orientation |
| [04 Setup](04_SETUP_AND_DEPLOYMENT.md) | Rebuild, operate, recover |
| [05 Configuration](05_ENVIRONMENT_VARIABLES.md) | Names only, never secrets |
| [06 Transfer](06_INFRASTRUCTURE_TRANSFER.md) | Dependencies and sequencing |
| [07 Services](07_THIRD_PARTY_SERVICES.md) | Runtime and optional providers |
| [08 IP](08_IP_AND_LICENSE_AUDIT.md) | Provenance and license evidence |
| [09 Costs](09_OPERATING_COSTS.md) | Billing inventory and scenario model |
| [10 Demo](10_BUYER_DEMO.md) | Three-minute truthful demonstration |
| [11 Closing](11_TRANSFER_CHECKLIST.md) | Owner/buyer acceptance checklist |
| [12 Listing](12_MARKETPLACE_LISTING_INFO.md) | Fields requiring seller evidence |
| [13 Privacy](13_LEGAL_AND_PRIVACY_REVIEW.md) | Technical gaps and legal questions |
| [14 Verification](14_VERIFICATION_AND_SCORE.md) | Test evidence, limits and readiness score |
| [15 Reliability and recovery](15_RELIABILITY_AND_RECOVERY.md) | Current fixes, database rehearsal and physical iPhone QA |
| [16 Release and owner actions](16_RELEASE_AND_OWNER_ACTIONS.md) | Verified deployment, TestFlight and production-release gates |
| [25 Team and entitlements](25_TEAM_WORKSPACE_AND_ENTITLEMENTS.md) | Workspace invitations, seats and server-side plan limits |
| [26 Team continuation](26_TEAM_CONTINUATION_2026-09-06.md) | Verification checkpoint and external release gates |
| [27 Strict post-team audit](27_STRICT_AUDIT_POST_TEAM_2026-09-06.md) | Current evidence-based score and exact blockers |
| [28 Regression and release pass](28_REGRESSION_AND_RELEASE_PASS_2026-09-07.md) | Auth delivery fix, native shell polish, local verification evidence, and release boundary |
| [29 Strict audit after regression pass](29_STRICT_AUDIT_AFTER_REGRESSION_PASS_2026-09-07.md) | Truthful score after the latest local fixes and external blockers |
| [30 Localization and code quality pass](30_LOCALIZATION_AND_CODE_QUALITY_PASS_2026-09-07.md) | Mobile English coverage, regional document localization and verification evidence |
| [31 Strict audit after localization pass](31_STRICT_AUDIT_AFTER_LOCALIZATION_PASS_2026-09-07.md) | Current normalized readiness score and remaining external gates |

Status vocabulary: **COMPLETE** means the stated bounded deliverable is verified; **NEEDS IMPROVEMENT** means technical work remains; **BLOCKED BY EXTERNAL ACTION** means a provider/account/device prerequisite; **REQUIRES OWNER DECISION** means commercial scope is undecided; **REQUIRES LEGAL/ACCOUNTING REVIEW** means specialist sign-off is outstanding. Multiple statuses can apply.

Generated evidence in `evidence/` contains package metadata, configuration names and source paths, not customer records or environment values. Regenerate using `node scripts/acquisition-inventory.mjs`. Metadata licenses are leads for review, not proof of compliance. Do not share raw Git history, NEXT-PASS.md, local output, billing exports or account identifiers in a public listing. Produce a redacted buyer copy after NDA and verify every artifact before sharing.

This is a technical acquisition package, not certification that the business is turnkey. The owner must supply corporate/IP records, account invoices, real metrics and transfer eligibility evidence.
