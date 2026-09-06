# 13 · Privacy, legal and accounting review

This is a technical gap register, not legal advice or compliance certification. French/EU-facing commercial release requires qualified review and the actual operator's details.

| Topic | Evidence / action |
|---|---|
| Privacy/terms/cookies pages | Present, but previously generic and partly stronger than implementation. Corrected some claims; final operator identity, address, registrations and hosting disclosures remain OWNER/LEGAL inputs |
| Trial/payment terms | Web card-free trial differs from Apple's eligible introductory offer and auto-renewal. Copy now distinguishes them; counsel verifies cancellation, taxes, refunds and business-user terms |
| Account deletion | No complete self-service deletion workflow established. App Store review requirements must be satisfied; mailto alone is not completion |
| Data export | Catalogue CSV exists; complete account/tenant portability is not established. Define scope, authenticate requests, exclude secrets/other users, test export integrity |
| Retention | Prior fixed durations lack evidence of automated enforcement. Define schedules for business records, logs, backups, soft deletes and legal holds; implement purge only after scope approval |
| AI processors | Verify paid/free tier training and retention terms, transfers, DPAs and customer information. Do not promise transient-only retention without contracts |
| Cookies/analytics | Session/org cookies are in source; verify deployed trackers and actual locale persistence. Necessary-cookie classification requires purpose review, not a blanket exemption |
| Photos/voice | Permission prompts are not the entire legal basis. Avoid personal/sensitive chantier content in demos; document processors and retention |
| Acquisition customer data | Not automatically part of an asset sale. Counsel determines basis, notices, rights, purpose compatibility and seller-copy deletion |
| Apple privacy / SDKs | App Privacy answers, permission descriptions, SDK manifests and actual data flows must match; developer account declarations unverified |
| Invoicing/accounting | Quotes are not proof of invoice compliance or recognized revenue; accountant reviews TVA, renewal receipts and sale taxes |

Deletion implementation specification (not completed): authenticated request + recent reauthentication; explain subscription cancellation separately; distinguish individual user from sole-owner organization; prevent orphaned organizations; revoke sessions; handle shared memberships, personal records, private files and external processors; preserve only legally required records under restricted access; test rollback/retries and audit without retaining deleted content. Owner/counsel must approve retention and organization ownership semantics before destructive automation is implemented.

DSAR operating procedure: receive at verified support channel; acknowledge; verify identity proportionately; log scope/deadline; export only authorized records; redact other persons; review retention holds; securely deliver; record completion and deletion propagation. No legal response-time guarantee is made here.

Reference: [CNIL guidance on selling customer files](https://www.cnil.fr/fr/vente-de-fichiers-clients-la-cnil-rappelle-les-regles). This concerns its stated customer-file context; it is not blanket approval for this transaction. [Apple transfer criteria](https://developer.apple.com/help/app-store-connect/transfer-an-app/app-transfer-criteria/) establish a separate operational gate. Recheck with advisers at closing.
