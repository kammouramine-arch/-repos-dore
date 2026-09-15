# Subscription and resend release — 2026-09-09

## Evidence and behavior

The previous purchase path registered listeners and dispatched requestPurchase
without querying the existing subscription group entitlement. It then classified
every missing completion event as a transaction timeout after 60 seconds. This
explains how an already-subscribed Apple account could enter the watchdog path;
the screenshots do not prove the exact native event sequence for that attempt.

Now an active-items-only StoreKit entitlement query runs before purchase dispatch.
All three immutable product IDs share group 22361541. Any returned group purchase
is server-verified before another purchase is considered. Same-workspace access
reconciles; another binding fails without purchase dispatch or transaction finish.
No catalogue query is required by restore/session reconciliation. Email identities
are never compared. Backend signatures, environment, bundle, appAccountToken and
originalTransactionId protection remain authoritative.

Success and cancellation settle listeners immediately. An actual pending state
gets pending-approval copy. A silent bridge retains a finite safety watchdog,
requeries entitlements once, and only reports pending if Apple returned pending.
Otherwise NATIVE_RESPONSE_MISSING is logged and retry/restore recover. This is not
an increased timeout or a promise that a purchase is pending.

FRA/USD mismatch suppresses price and introductory copy. At the user's explicit
request, a fetched product remains purchasable with "Prix confirmé par Apple lors
de l’achat"; native Apple confirmation supplies the price before consent. No USD
conversion, counterfeit EUR price, or public diagnostic UI. Public acceptance
still requires consistent metadata or documented Apple guidance.

## Cooldown

POST /api/auth/code-email success and rate-limit errors expose retryAfterSeconds.
429 also has Retry-After. GET returns the persisted cooldown for the authenticated
user only, with no-store. Minute cooldown and hourly quota both use actual stored
deadlines; no counters reset locally. Verification uses a wall-clock deadline,
refreshes on resume, disables resend until zero, and rejects stale status replies.
Normal auth/startup screens no longer expose request references. Safe logs retain
them for support.

## Ownership recovery / sandbox

See SANDBOX_RESET_PROCEDURE.md. Operator-only command defaults to dry-run, requires
exact Sandbox environment, matching transaction, empty business records, written
provenance and approval. Archives before clearing binding in one transaction.
No HTTP reset route, no production reset, no automatic subscription transfer.
The known Bhjn workspace is NOT eligible: it has customer/quote activity and its
automated provenance was not established. No data or ownership reset was made.

Support can use hashed transaction and owning-workspace references in restricted
server logs to locate the binding in an authorized database audit. Never expose
another customer's name/email/workspace to a newly created login. Verify access
to the original DEVISERA account before disclosing identity or recovering access.
Resetting a backend binding does not erase Apple's purchase history or the signed
appAccountToken. Use Apple sandbox purchase-history controls or a fresh sandbox
test identity for genuinely fresh tests; never remove appAccountToken checks to
make an old transaction claimable by an unrelated account.

## Multiple independently paid businesses — recommendation, not implemented

Apple normally permits one active subscription per group per purchase account:
https://developer.apple.com/app-store/subscriptions/

Recommended: one billing owner/organization subscription with explicit workspace
capacity tiers, allocating access to its businesses. This requires a deliberate
commercial/data-model migration, not another concurrent purchase in this group.
For independently invoiced businesses, existing web billing could support separate
customer/subscription records, subject to App Store payment/linking rules and legal
review. Another option is distinct subscription groups for genuinely independent
offerings, with a finite catalogue and separate lifecycle/eligibility; do not use
an unbounded group per customer or restructure current products casually.
Apple's newer organization/group purchasing APIs require a separate availability,
SDK and business-model review before adoption. No ASC product change in this pass.

## Acceptance

Automated native tests use a mocked SDK, backend integration uses isolated local
PostgreSQL and mocked signed-transaction decoding. Neither proves real Apple
delivery. Verify current clean build on iPhone: cooldown/resume, fresh signup,
active same-workspace preflight, other-workspace safe conflict without Apple sheet,
cancel/retry, purchase -> server entitlement -> Home, restore and localized price.
