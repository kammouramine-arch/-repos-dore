# Strict DEVISERA acquisition audit after the 2026-09-07 regression pass

## Truthful score: 76 / 100

This is a local, evidence-based score. It is not a claim that the latest code
is deployed, that an email reached an inbox, or that a physical iPhone accepted
the new build.

| Area | Score | Evidence and remaining gap |
| --- | ---: | --- |
| Product reliability and native UX | 20/22 | Auth delivery failures now surface honestly; route labels, client profile, query guards, floating nav, haptics and loading states are implemented. New binary and real-device regression pass are still required. |
| Plans, teams and entitlements | 8/10 | Server-side plan/seat/AI limits and invitation controls exist. Full PostgreSQL integration execution remains blocked. |
| Privacy, deletion and export | 6/8 | Personal export/deletion and business export permissions exist. Retention/anonymization policy and production execution need owner/legal evidence. |
| Email and customer communications | 4/8 | Provider failures no longer produce a false “code sent” state; sender defaults are DEVISERA. Resend DNS/configuration, delivery logs and a real inbox receipt are not verified. |
| App Store, TestFlight and payments | 7/14 | StoreKit uses Apple’s localized product price and Apple management/restore links. The latest local code is not in a new TestFlight binary; storefront and payment-sheet artwork remain account/device checks. |
| Infrastructure transferability | 8/12 | Runbooks and health probe are present. GitHub/Vercel/EAS/Apple/Resend ownership and billing evidence remain external. |
| IP, legal and marketplace package | 7/10 | Acquisition package, asset/license inventory and handover docs exist. Legal identity, contributor assignments, metrics and account transfer eligibility remain owner evidence. |

## 95+/100 and 100/100

- 95/100 is **not** justified: deployment, inbox delivery, integration
  execution, StoreKit storefront, physical-device acceptance and legal/account
  evidence are still open.
- 100/100 is **not** truthful and should not be claimed for a live acquisition
  without sustained production evidence, transfer completion and legal review.

## What is technically fixable now vs external

**Complete locally:** auth delivery error propagation, health probe, native
navigation/header polish, English coverage on the native shell, StoreKit price
rendering, support/rating/payment links, typechecks, unit suite, web build and
iOS export.

**Blocked by external services:** Git push/EAS build and submission in this
session (network escalation rejected after the execution account reached its
usage limit); Resend domain verification and logs; Vercel production deploy;
Apple storefront/payment-sheet artwork; real inbox and physical iPhone QA.

**Owner action:** perform the commands and provider/account steps in [28 —
regression and release pass](./28_REGRESSION_AND_RELEASE_PASS_2026-09-07.md),
then record the resulting remote SHA, EAS build ID, App Store processing state,
Resend delivery ID and device test evidence.

## Marketing truth

DEVISERA can be shown to a serious buyer as a technically documented product
with clearly disclosed release and operating gaps. It cannot yet truthfully be
marketed as a fully production-ready, transferable, turnkey acquisition until
the owner actions above are completed and evidenced.
