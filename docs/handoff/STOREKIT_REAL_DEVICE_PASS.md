# DEVISERA — purchase recovery pass

Date: 2026-09-08. Branch: `integration/devisera-final`.
Baseline: `f14458e65d99ed630a65007dae3e836682de3095`.

## Evidence and limits

The supplied IMG_4490/4491 screenshots show Apple's USD product metadata, an
active purchase spinner, then the application's 60-second timeout and recovered
controls. They do **not** contain a native StoreKit error code. No physical
iPhone transaction was executed from this Windows environment. An exact native
cause cannot honestly be assigned from these images alone.

Confirmed code defects:

- Purchase awaited both an event result and native dispatch. A dispatched
  promise remaining pending could keep UI busy even after cancellation/success.
- The iOS return value from expo-iap 5.5.0 was ignored; only a separately mounted
  auth-root observer could confirm the purchase.
- Auth-root observer cleanup rejected active purchases when that effect changed.
- expo-iap's default transaction-ID deduplication survives observer recreation:
  a retry of a transaction previously rejected by the backend could be hidden.
- Product/restore/finish SDK operations had no bounded recovery; stale product
  state was retained during a failed reload.
- A large storefront diagnostic Banner was deliberately rendered for non-EUR
  products. This is the pale blue panel visible in the provided screenshots,
  not evidence of an independently reproduced z-index or gradient corruption.

## Changes

Each purchase installs its own update/error listeners before dispatch. Both
returned transactions and event transactions use the same server-first
verification/finish path. Duplicate channels are coalesced. The root observer
handles background updates; remounting it does not cancel an active attempt.
SDK duplicate filtering is disabled in favor of application/server idempotency.

The event result, not a potentially unfinished dispatch promise, controls UI
completion. Dispatch rejection is handled immediately. Cancellation is an
explicit outcome, skips session refresh, and shows no purchase error.
All attempt listeners/timers and busy state are cleared. Restore, product fetch,
connection and transaction finishing have bounded waits. The existing 60-second
purchase watchdog was not increased and now has a distinct diagnostic code.

Successful server verification still precedes transaction finishing. The
paywall refreshes the persisted server session and routes only when actual
access is active; no local entitlement, receipt bypass or free access added.
Auth, billing API, legal pages and workspace ownership rules were not changed.

Product prices remain exclusively Apple `displayPrice`. Reload clears old
metadata; foreground refresh reloads offers unless a purchase is active.
Actual storefront and currency are recorded internally, not displayed in a
debug banner. No conversion or hard-coded EUR fallback exists.

Removed the diagnostic panel, made the trial information surface white,
and protected card checkmarks/radio indicators from flex shrinking. No changes
to the bottom bar, account screens, launch animation or overall design system.

Diagnostics record purchase invoked, transaction received, entitlement verified,
transaction finished, native error codes, product, storefront/state and API
request references when supplied. No receipts, tokens, passwords or codes are
included. Failure families distinguish cancellation, pending approval, timeout,
product/storefront failure, network, and backend verification. The API client's
existing firewall-denial classification remains intact.

## App Store Connect inspection and limited copy corrections

Group `22361541`; all products monthly, `Prepare for Submission`:

| Plan | Product ID | France price | Intro offer |
| --- | --- | --- | --- |
| Essential | fr.devisia.essentiel.monthly | EUR 39 | 3 days free |
| Pro | fr.devisia.pro.monthly | EUR 79 | 3 days free |
| Enterprise | fr.devisia.entreprise.monthly | EUR 149 | 3 days free |

Availability is one territory, France. Pro's availability dialog explicitly
showed France checked and USA/UK unchecked; Essential/Enterprise also expose
the checked France input. Offers start September 5, 2026, without an end date.
The Enterprise US price is USD 129, matching the screenshot. That supports a
test-storefront mismatch, but the device's actual storefront remains unverified.

French product display names were changed to DEVISERA Essentiel, DEVISERA Pro,
and DEVISERA Entreprise. Enterprise's misleading unlimited description was
replaced with “Devis IA et outils pour votre équipe.” Internal reference names
and immutable IDs remain unchanged. French subscription-group and custom app
display names were also changed to DEVISERA. No public review, pricing/territory change,
agreement acceptance, or purchase was performed by this pass.

## Production checks and external gates

Live `https://devisia-bice.vercel.app`: health 200; Privacy, Terms and Mentions
légales 200; unauthenticated billing/payments 401, with no mitigated header in
these samples. This is not proof that authenticated POST traffic never meets
the firewall. The production POST probe was rejected by the safety reviewer;
no billing write was sent. No security rule was disabled.

Owner completed Vercel authentication. Code commit
`815b1383cdc76563964bbd8be08bf8f0037ec095` was pushed and deployed with the
existing Production environment. Deployment `6qbknD67yca5zeWb2DQkF8SgMcyx`
is Ready at `devisia-hc9a40tx9-amyn1.vercel.app`, aliased by
`devisia-bice.vercel.app`. Post-deployment GET checks returned health 200,
billing/payments 401 without authentication, and all three legal pages 200.
The automatic Preview failed because DIRECT_URL was absent in Preview;
production credentials were not copied there. Production deployment succeeded.

The live firewall has no custom rules and Bot Protection is inactive; system
DDoS mitigation remains active. The past-day view showed 231 allowed and 10
denied requests. Denials were system mitigations on account, email-code,
session and customer paths, not billing/apple. Some used mobile-looking user
agents from Google-hosted addresses; that alone does not establish legitimate
iPhone traffic. No security rule was weakened without a proven narrow cause.
Hobby runtime logs retain only the last hour: no billing/apple request was
available there, and the earlier screenshot incident could not be recovered.

APPLE_ALLOW_SANDBOX exists for Production but is saved as write-only Secret;
its boolean value cannot be read in the dashboard. It was not overwritten.
Sandbox acceptance must therefore be established by the real purchase test,
or an authorized operator must confirm its intended value through configuration.
All three French product names and the French group/custom app name were
verified persisted after reloading App Store Connect. Products remain Prepare
for Submission; no public review was initiated and full payment-sheet artwork
was not verified on an iPhone.
The new mobile changes still require a new native build; a backend deploy cannot
modify an already installed TestFlight binary.

## Exact real-iPhone acceptance

1. Use a dedicated sandbox Apple account whose App Store country is France.
   In App Store Connect: Users and Access → Sandbox → select tester → App Store
   Country or Region → France. Do not change the personal account's region
   merely to test. On device, follow Apple's TestFlight sandbox instructions:
   sign out of Media & Purchases, then sign in under Settings → Developer →
   Sandbox Apple Account. After changing sandbox region, sign out/back in there.
   Reference: https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox
2. Install the future build containing this commit; record version/build number.
   Reopen offers: verify EUR 39/79/149 and matching Apple confirmation-sheet price.
3. Verified login must not send a code. Without access it reaches paywall.
4. Cancel the sheet: no error, spinner clears, plans and Restore remain usable.
5. Buy one plan: record safe diagnostics; require transaction received → server
   verification → finish → fresh session → Home, without restart.
6. Interrupt network during verification; no false success. Restore after network
   recovery and verify access, without a second payment.
7. Restore after reinstall using the same Apple and DEVISERA accounts. Try a
   different DEVISERA account: ownership conflict must not transfer entitlement.
8. Background/resume while sheet is open, rapid taps, retry after timeout, and
   both UI languages. Capture any native failure via account diagnostics export.
9. Check full paywall scroll and large text: no diagnostic panel, no clipped
   price/checkmark or unexpected colored blocks. Test Mon espace, billing links,
   account Back, tabs, +, Teams and legal destinations.

Release gate: **not production-ready until a real TestFlight purchase succeeds
and the French storefront displays EUR**. No EAS build is requested in this pass.

## Verification results

- Root and mobile TypeScript: passed.
- Root and mobile ESLint: passed (an effect-loading lint failure was fixed and rerun).
- Full Vitest suite against isolated PostgreSQL on 127.0.0.1:55432:
  406 tests in 57 files passed. Includes auth, verification, entitlements,
  workspace/team, deletion/export and native SDK mocked lifecycle regressions.
- New native lifecycle cases cover returned-only transactions, event success
  while dispatch remains pending, observer replacement, cancellation without
  product ID, timeout recovery/retry/restore, rejected verification and finish
  ordering. These are not a native iPhone purchase test.
- Production web build: passed, 68 generated pages.
- iOS Expo export: passed, 1434 modules. This is not an IPA or signing verification.
- Existing Prisma configuration and Next middleware deprecation warnings remain;
  no unrelated dependency migration was attempted.
- No production data or secrets were included in the new documentation/tests.
- The isolated PostgreSQL test server was stopped after verification.
