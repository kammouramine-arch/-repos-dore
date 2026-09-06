# Strict acquisition checkpoint — after workspace implementation

Date: 6 September 2026. This is an evidence-based technical checkpoint, not a legal opinion, App Store approval or production-email confirmation.

## Score: 73 / 100

| Area | Score | Evidence / remaining gap |
|---|---:|---|
| Product implementation and reliability | 18/22 | Core web build, unit suite and iOS export pass; native cold-start, StoreKit and physical-device acceptance remain unverified. |
| Entitlements and team workspaces | 8/10 | Server-side AI limits, shared counters, invitations, roles and seat safety are implemented; PostgreSQL integration execution is blocked. |
| Privacy, deletion and export | 6/8 | Personal deletion/export and owner/admin business export are implemented; retention/anonymization policy still needs legal review. |
| Email and customer communications | 3/8 | Code is configured for `DEVISERA <contact@devisera.fr>` with matching Reply-To; Resend domain verification and an end-to-end delivery proof are missing. |
| App Store, TestFlight and payments | 7/14 | Existing production EAS profile and Apple IDs are documented; current branch is not remotely advanced and no new build was started in this restricted session. Apple payment-sheet branding remains external. |
| Infrastructure transferability | 8/12 | Source configuration and handover docs are strong; Vercel/EAS/Apple/Resend ownership, billing and transfer evidence remain owner-side. |
| IP, legal and marketplace package | 7/10 | Asset/license and transfer package exists; legal entity, contracts, retention and real metrics require owner/legal evidence. |

The score is deliberately below the 85–90 target because external delivery, release and real-device evidence are not substitutes for source changes. It is not truthful to call the current state a turnkey acquisition yet.

## Exact blockers

- Remote branch `codex/devisia-premium-fluidity` currently points to `d1438f6...`; local HEAD is `105e5bd`. Commits `a45204d` and `4847fc8` exist as GitHub objects, but the branch ref does not include the current local commits.
- Terminal network permission was denied in this session. The GitHub connector can read the repository but cannot safely reproduce the complete local commit history without creating a different squashed history, so no API rewrite was performed.
- EAS `production` profile is configured in `mobile/eas.json`, but no build/submission was started. A clean checkout with the pushed branch and production `EXPO_PUBLIC_API_URL` is required.
- PostgreSQL at `127.0.0.1:5432` is unavailable, so integration tests did not execute.
- Resend/OVH DNS records and a real recipient delivery proof are not available to inspect here.

## Owner actions

1. From the repository checkout, run `git push origin codex/devisia-premium-fluidity` and verify the remote head reaches `0bc380b` (or a later release commit). Do not cherry-pick or recreate the existing history.
2. On the pushed branch, run `cd mobile; eas build --platform ios --profile production` and then `eas submit --platform ios --profile production` after the EAS production environment has a stable HTTPS API URL. Confirm the build appears in App Store Connect and install it through TestFlight.
3. In Resend, add `devisera.fr` and copy the exact SPF/DKIM records it provides. Add those records in OVH DNS without changing the existing Zimbra MX records. Verify the domain, set production `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM="DEVISERA <contact@devisera.fr>"`, and `EMAIL_REPLY_TO=contact@devisera.fr` in the production secret store. Send a real test to an address you control and retain the delivery event ID privately.
4. In App Store Connect, update the app name, subtitle, support/privacy URLs and subscription display metadata to DEVISERA; confirm the payment sheet shows the intended app artwork. These are account actions and require Apple’s review/propagation.
5. Start PostgreSQL 17 on an isolated `devisia_test` database, run the migrations and `npm test`; keep production URLs out of test configuration.
6. Complete legal review of retention, shared-workspace deletion, GDPR notices, App Store privacy answers and the sale/transfer treatment of customer data.
