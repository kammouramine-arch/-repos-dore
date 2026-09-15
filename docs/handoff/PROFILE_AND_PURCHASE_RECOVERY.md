# Profile photo and purchase recovery — 2026-09-09

## Release scope

Private profile photos use authenticated GET/POST/DELETE `/api/auth/avatar`.
Only the authenticated user is the selector. Photos are resized/re-encoded to
256px JPEG without EXIF, stored outside shared workspace files, included in
personal export and removed during personal account deletion. No migration is
needed. Deploy the backend before distributing a mobile build with this action.
Library/camera selection, native crop, preview, replacement and removal retain
the existing Mon espace header. Physical iPhone permission/crop checks remain.

## Current evidence and limits

The September 8 Build 29 purchase request reached the production backend and
returned 409; Vercel Firewall allowed it. A read-only production audit found one
bound Sandbox original transaction. Its workspace contains one customer and one
quote. There is insufficient evidence that it is an automated disposable probe.
No binding or business data was changed. Account identifiers are deliberately
omitted from this source-controlled handoff.

Current iOS cards read native product `displayPrice`; no application USD price
fallback was found. The screenshot alone cannot establish the returned native
product metadata. Device PRODUCT_METADATA/storefront diagnostics are still
required to resolve the disagreement with Apple's native purchase sheet.
Do not claim EUR rendering fixed or substitute configured French amounts.

## Safe recovery

1. Capture the failing request reference and hashed original-transaction reference.
2. Read the verified transaction environment, existing workspace binding, owner,
   creation/audit provenance and business-record counts using an authorized
   administrative session. Never compare DEVISERA email with Apple ID email.
3. Same workspace: restore and server-verify; refresh the session before routing.
4. Different workspace: retain protection, offer original-account recovery and
   support. Do not encourage another purchase or automatically transfer ownership.
5. Test reset is eligible for consideration only with positive provenance that the
   account is disposable, verified Sandbox environment, and no business data.
   Obtain explicit approval naming the exact binding and intended action first.
6. Before an approved reset, preserve a restricted backup, recheck ownership and
   expiry under a transaction lock, and perform the reviewed targeted change.
   Never use broad subscription deletion or production integration-test cleanup.
7. Restore on the intended test account and verify server entitlement and Home.

For independent TestFlight journeys use separate Apple sandbox purchase identities
where supported. A fresh DEVISERA email alone does not reset Apple purchase history.
Do not reset the currently audited binding under this procedure without further
evidence and explicit owner approval.

## Device acceptance still required

- Current native prices match Apple's sheet for all three products.
- A genuinely independent new purchase activates its intended workspace.
- Same-workspace restore unlocks; other-workspace restore remains protected.
- Photo permission denial, crop, save, replace, remove, restart and account switch.
- No photo or prior account state appears after switching identities.
