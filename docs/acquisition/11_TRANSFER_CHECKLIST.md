# 11 · Closing and handover acceptance

All boxes start unconfirmed. Assign a named seller/buyer operator and dated evidence link to each before closing. No transfer happens merely because this document exists.

## Before agreement

- [ ] Counsel confirms asset versus company sale, title, exclusions and customer-data scope.
- [ ] Seller provides identity/KYC and authority to sell through the marketplace's secure process.
- [ ] Agree price, currency/tax, escrow, liabilities/refunds, support period/hours and acceptance criteria.
- [ ] Sign exact asset list and third-party exceptions; verify domains, trademark and contributor assignments.
- [ ] Confirm Apple eligibility, Stripe entity-change process and every provider's constraints.

## Prepare buyer environment

- [ ] Buyer creates organizations, MFA, billing, recovery contacts and secret manager.
- [ ] Tag delivery commit; audit Git history/secrets/licenses; decide whether unrelated archive is excluded.
- [ ] Back up database/files and prove isolated restore; record RPO/RTO and rollback owner.
- [ ] Buyer installs locked dependencies, migrates local database and passes agreed tests.
- [ ] Transfer/reconnect repository, GitHub Actions, deploy keys, webhooks and protections.
- [ ] Transfer domain/DNS with registrar authorization and certificate checks; preserve MX/SPF/DKIM/DMARC.
- [ ] Transfer/migrate Vercel, Supabase, storage and Expo; validate runtime, regions and backups.
- [ ] Reconcile custom authentication/session keys; document forced logout/recovery if rotating.
- [ ] Stripe support approves entity/account procedure; reconcile subscriptions/refunds/payouts.
- [ ] Replace AI/transcription/email/SMS keys with buyer-owned keys; validate budgets and controlled delivery.
- [ ] Transfer Apple app only when eligible; review subscriptions, receipts, notifications, signing, push and any future Sign in with Apple identifiers.
- [ ] Confirm whether Google Play exists; follow its process only if included.
- [ ] Transfer analytics, monitoring, cron ownership, alert destinations and brand/design files.

## Cutover and closure

- [ ] Freeze changes; synchronize final data; verify checksum/count samples without disclosing unnecessary personal data.
- [ ] Test signup/recovery, tenant isolation, quote/AI/photo/PDF, customer/lead, email, billing purchase/renewal/cancel/restore, cron and offline behavior.
- [ ] Reconcile billing and data cutover timestamps; obtain buyer acceptance.
- [ ] Rotate secrets and remove old owner access after rollback/support access is explicitly agreed.
- [ ] Remove seller devices/tokens, provider memberships, deploy credentials and recovery channels; prove buyer can recover independently.
- [ ] Record retention/deletion instructions for seller copies and close escrow under the contract.

Never revoke the last working administrator before buyer access and recovery are tested. Never send secret bundles through ordinary email or put them in the acquisition folder.
