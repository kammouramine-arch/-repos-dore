# DEVISERA — Apple purchase/access reconciliation

2026-09-08, integration/devisera-final. No new TestFlight build in this pass.

## Proven production failure

Vercel runtime logs for the supplied 17:52–17:59 iPhone test show:

- POST /api/billing/apple: 500, Prisma P2002 on appleOriginalTransactionId
  (references 7e1a5b8a and f5ed15fb).
- Apple notifications at 17:54 failed on the same unique index.
- Later purchase sync attempts returned 409.
- Authentication/session requests succeeded. These requests reached the server;
  their failure was not a firewall denial.

A read-only Supabase query found one sandbox Apple binding, Essential, canceled,
with an old September 6 expiry. The owner email was reported privately to the
operator, not copied into this buyer-facing document. No production row changed.
Reusing the same TestFlight purchase account for multiple DEVISERA workspaces
explains the original-chain conflict. Apple's successful sheet does not imply
that the current DEVISERA workspace owns the existing subscription.

## Binding and access fixes

- The established original transaction binding wins over later appAccountToken
  values. Signed renewals/webhooks update the existing owner, never silently
  transfer to a newly tested workspace.
- A chain-level advisory lock and explicit ownership check replace the unique
  index crash with a safe conflict. Signature/bundle/environment/role checks stay.
- Verified iOS owners without backend access query current Apple entitlements
  on login/resume, without an interactive restore sheet. Transactions still
  require backend verification. No receipt-free local unlock was added.
- Manual Restore uses active entitlements and the same verification path.
- Session refresh uses actual nextStep/access; successful access routes to Home.
- Native finishing remains after backend verification but cannot hold verified
  access hostage if Apple's finish promise stalls. Errors remain diagnosable.
- An account mismatch explicitly tells the user not to repurchase and to use
  the original DEVISERA account/support. No account identity is leaked by the API.

## Price evidence and fixes

Repository search found no $35/$69/$129 fallback feeding the native paywall.
The rendered source is fetchProducts -> product-by-ID -> displayPrice -> PlanCard.
The native purchase path fetches a product again, whereas the UI held its earlier
snapshot and skipped refresh while its purchase action was active. The exact
StoreKit reason for the earlier USD response cannot be recovered from screenshots.
The earlier assertion that the device must simply have a US storefront is not
established by this new evidence.

The app now checks storefront before/after fetch, refetches changed/inconsistent
metadata, and rejects persistent currency inconsistency without conversion.
It refreshes immediately before purchase and after completion; a changed price
requires review before dispatch. Request epochs prevent older loads overwriting
newer offers. No web-price fallback is accepted. If Apple continues returning
inconsistent metadata, show a recoverable load error, never fabricate EUR.

Trial notes/CTA derive from eligibility and product free-trial duration. Unknown
or false eligibility does not advertise a trial. The subscription period derives
from the native product. No manual date extension or sandbox-time correction.

## Verification

- 414 tests / 59 files passed, including isolated PostgreSQL reconciliation:
  no access -> signed transaction persistence -> session app/access true;
  repeat receipt idempotency; second workspace denied; original owner repaired
  despite a newer Apple account token; webhook routing to established owner.
- Native mocks cover active-entitlement reconciliation, pending finish recovery,
  purchase/cancel/restore, EUR replacing a prior USD product, and trial eligibility.
- Root/mobile TypeScript and lint, production web build, iOS Expo export checked.
  A Windows Prisma DLL lock during concurrent tests/build was resolved by waiting
  for tests to finish and rerunning the build. No dependency changes required.
- These tests are not physical StoreKit acceptance. UI navigation and EUR must
  still be checked on the next binary. No new native build or purchase was made.

## Safe test-state reconciliation

1. Use the original DEVISERA login reported to the operator. On the next binary,
   login automatically queries current Apple entitlements; manual Restore is also
   available. A currently valid signed renewal should repair that same workspace.
2. If that login is inaccessible, recover it only through legitimate account
   recovery. Do not bypass verification for a mistyped/test email.
3. For isolated new-account testing, create a dedicated Sandbox tester in App
   Store Connect, set France, and follow Apple's TestFlight sandbox sign-in steps.
   Use Clear Purchase History only for that dedicated tester when a clean trial
   is required. Do not change the personal Apple account's country or erase data.
4. Resetting/reassigning the existing backend test binding is a separate explicit
   owner-approved operation with backup and sandbox-only scope. Not performed.

Apple reference: https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox

Acceptance gate: correct Apple-localized card price AND a successful native
purchase/reconciliation unlocks the rightful account. Not yet physically verified.
