# 06 · Infrastructure transfer plan

No transfers authorized or performed. Do not sell personal account logins. Buyer creates its own organization, MFA, billing and recovery contacts, then receives project/repository roles or provider-approved migrations.

| Service | Known coupling | Eventual action / acceptance |
|---|---|---|
| GitHub | Repository under owner's account; local unpublished changes possible | Agree canonical branch/tag; transfer repository or clean export; inspect history, issues, Actions secrets and deploy integrations; buyer clones/builds |
| Vercel | Existing owner team and project | Assess supported team transfer; recheck domains, environment scopes, cron and integrations; buyer deploys with own account |
| Supabase | Existing project/account; custom app sessions in PostgreSQL | Organization transfer if eligible, otherwise tested migration; preserve schema/files and review region/DPAs |
| Expo/EAS | Existing owner team, signing and submission credentials | Provider-supported project/organization transfer or migration; update project configuration and submit credentials; buyer builds successfully |
| Apple | Individual developer account; app is still pre-release | **BLOCKED**: Apple requires at least one App Store-released version for app transfer. Recheck eligibility at transaction time. Do not promise current TestFlight-only record is directly transferable |
| Stripe | Account-specific customer/subscription/price IDs | Contact Stripe Support before entity transfer; do not simply substitute another account's secret key |
| AI providers | Owner's project/API billing | Buyer issues keys, quotas and billing in its own project; test models before revoking old keys |
| Email/DNS | Proposed contact@devisera.fr ties to another brand | Owner decides dedicated product domain/mailbox; verify registrar title and sender DNS. Reverify sender on destination provider |
| Storage | Database default, optional S3 | Confirm actual provider. Copy/check blobs and update access policy without exposing objects |
| Push | Expo credentials and Apple team | Validate entitlements/keys after transfer; old device tokens may need re-registration |
| SMS / analytics / monitoring | Code paths exist; live accounts not established | Inventory actual usage first; do not include speculative accounts |
| Google Play | Config exists, live listing not verified | Confirm whether an account/listing exists before planning a transfer |

Sequence: signed scope → owner evidence → buyer accounts → isolated restore/rebuild → parallel provider validation → coordinated cutover → smoke tests → reconciliation → revoke seller access. Keep source/API and database schema compatible during rollback window. Replace personal recovery channels only after buyer recovery tests succeed.

Provider evidence checked 6 September 2026: [Apple transfer criteria](https://developer.apple.com/help/app-store-connect/transfer-an-app/app-transfer-criteria/), [Vercel project transfer](https://vercel.com/docs/projects/transferring-projects), [Supabase project transfer](https://supabase.com/docs/guides/platform/project-transfer), [Stripe acquisition process](https://support.stripe.com/questions/transfer-a-stripe-account-to-a-different-entity-due-to-a-business-sale-or-acquisition). Eligibility is account-specific and can change; retain provider approval in the restricted closing annex.
