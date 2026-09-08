# DEVISERA engineering handoff

## Final integration update — 2026-09-08

The integration branch is `integration/devisera-final`, based on engineering
`ccb0094` and UI `2ad5445`. See `FINAL_INTEGRATION.md` for verification.

- Claude's payment screen now consumes `GET /api/billing/payments`, an alias of
  the existing `/api/billing/history` handler, returning `BillingHistoryDTO`.
  It uses `entries`, `description` and provider-level metadata. The older UI
  handoff's `/paiements` and `PaymentHistoryDTO.items` proposal is superseded.
- Apple history has no invented rows; actual Stripe invoice rows retain their
  status/currency/amount. Open invoices show amount due, not zero amount paid.
- Solo account deletion archives the empty workspace, disables automation,
  cancels planned follow-ups, revokes invitations and all personal sessions.
  Another active teammate without another OWNER still requires transfer.
  Commercial records are retained, not purged. Retention policy needs legal review.
- Account deletion does not cancel Apple billing; the deletion screen warns
  users to cancel provider billing first. No live subscription is changed here.
- Account confirmation adopts the server-returned verified session immediately.
  Codes retain Unicode normalization and leading zeros; email requests use the
  persisted account language.
- The single root stack explicitly protects verification and verified routes;
  visually hiding screens is not used as authorization.
- The legal notices route exists and is linked, but publisher identity remains
  incomplete. A successful HTTP response is not legal readiness.

This document is the contract between the reliability/backend work and the
mobile presentation work. It describes observable behavior and data shapes;
it does not grant access to production secrets.

## Account and profile

`GET /api/auth/session` is the source of truth after launch, foreground resume,
login, logout and email confirmation. It returns:

- `user.id`, `email`, `firstName`, `lastName`, `locale` (`fr` or `en`), and
  `emailVerified` derived from persisted `users.emailVerifiedAt`;
- the active organization (`id`, `name`, `role`, `trade`,
  `onboardingCompleted`);
- `subscription`, `access` and `nextStep`;
- AI capability flags.

Never infer verification or entitlement from local storage alone. A cached
session is only a paint-time fallback; a successful server refresh replaces it.

`nextStep` is one of:

| State | Value |
| --- | --- |
| email is not verified | `verify_email` |
| verified but no active trial/subscription | `subscription` |
| verified with write access | `app` |

## Email verification

Signup and explicit email changes call `POST /api/auth/code-email`. Codes are
six canonical digits, expire after ten minutes, are single-use, and are rate
limited. `PATCH /api/auth/code-email` normalizes Unicode digits/whitespace,
verifies under a row lock, updates `emailVerifiedAt`, and returns a freshly
rebuilt session. A normal sign-in never sends a code; only an unverified session
is routed to the verification screen.

## Subscription state

The server persists the provider and entitlement in `Subscription`. Mobile must
route using `session.access`/`session.nextStep`, not a locally selected plan.
Apple transactions are accepted only after the signed JWS is verified, the
`appAccountToken` matches the organization UUID, and the transaction is
persisted. The transaction is finished only after `/api/billing/apple` succeeds.

`SubscriptionDTO.provider` is `apple`, `stripe`, or `trial`. Apple product
identifiers are stable technical identifiers and must not be renamed during the
DEVISERA rebrand.

## Localized prices and documents

Apple `ProductSubscription.displayPrice` and its currency are authoritative for
the storefront. Never convert or hard-code a USD amount in the mobile client.
France should resolve to EUR, the United Kingdom to GBP, and the United States
to USD when the corresponding App Store storefront is configured. A sandbox
account can legitimately return a different storefront and requires owner
verification in App Store Connect/TestFlight.

Business country and language are independent organization fields. Document
generation reads the organization country/currency and locale; it must not map
English to a particular country.

## Billing history and actions

`GET /api/billing/history` requires `billing:view` and returns:

- `provider: apple`: no invented rows; links to Apple subscription management
  and `reportaproblem.apple.com` for receipts/history;
- `provider: stripe`: actual Stripe invoices (amount, currency, status and
  Stripe receipt URL), with `manageAction: stripe_portal`;
- `provider: trial`: an empty history and an explanatory note.

`POST /api/billing/portail` opens the Stripe portal. Apple management uses
Apple's subscription-management URL or the native StoreKit management sheet.

## Support actions

- Rate the app: `itms-apps://itunes.apple.com/app/id6806865251?action=write-review`.
- Contact: `mailto:contact@devisera.fr`; diagnostic context may include app
  version, language and a user reference, never passwords, codes, tokens or
  customer content.
- Account deletion: `DELETE /api/auth/account` requires the current password
  and `SUPPRIMER`; access is revoked and commercial records are retained when
  another member or a legal retention duty requires them.
- Exports: `/api/auth/export` (personal identity/memberships) and
  `/api/organization/export` (commercial data) return real persisted data.

## Navigation contracts

The authenticated layout owns route guards and server-state routing. Visual
animations must not delay the route transition or intercept the central create
action. The central `+` action must navigate immediately; required data loads in
the destination with a recoverable error/retry state. Back actions should call
the router once and remain safe when a verification timer or request is in
flight.

## StoreKit diagnostics

The mobile purchase listener records a bounded `STOREKIT_<native-code>` event
with category/path metadata. It never records a receipt, token, password or
email. A purchase promise resolves only after the update listener has synced
the transaction to the server and finished it; StoreKit cancellation is silent,
while network/provider failures remain retryable.

## External owner actions

The following cannot be completed safely from source code alone:

1. Verify `contact@devisera.fr` and the Resend production key/domain in the
   deployment environment; send a real inbox test and inspect Resend delivery.
2. Review Vercel Firewall events for `x-vercel-mitigated: deny` and add the
   narrowest route/rate-limit exception; never disable the firewall globally.
3. Confirm App Store Connect storefronts, subscription availability,
   introductory offers, agreements, pricing and the production app icon.
4. Complete publisher identity, hosting details and legal review on the legal
   pages before public sale.
