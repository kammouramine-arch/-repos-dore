# DEVISERA authentication state machine

## Canonical states

The API returns `session.nextStep` and the server-authoritative `session.access` on every authenticated session response. Clients must treat these values as routing instructions, not as permissions they can grant themselves.

| State | Entry condition | Allowed surfaces | Normal workspace APIs |
| --- | --- | --- | --- |
| `verify_email` | `user.emailVerifiedAt` is null | Verification, account correction, sign out | Rejected by `requireAuth({ requireVerified: true })` |
| `subscription` | Email verified and `access.canWrite` is false (missing, expired, canceled or incomplete subscription) | Subscription, account, support, sign out | Read access is deliberately non-destructive; every paid mutation checks `assertCanWrite` |
| `app` | Email verified and entitlement is active/trialing/past-due | Full workspace | Subject to role permissions and plan limits |

The order is deterministic: an unverified identity always remains in `verify_email`, even if a stale subscription record exists. A verified identity with no usable entitlement moves to `subscription`; it cannot reach the mobile workspace by changing a local cache or deep-linking a tab.

## Pending signup recovery

Signup creates the user and organization before requesting the email challenge. This is intentional: a provider outage must not lose the user’s submitted account. If the first email request fails, the API returns a typed `PROVIDER_UNAVAILABLE` response and does **not** claim that a code was sent.

Retrying signup with the same email and password now reuses the existing unverified account and requests a fresh challenge (HTTP 200 with a restricted, unverified session). A wrong password remains a generic conflict and does not issue a session. A verified duplicate remains a normal conflict.

The challenge is persisted with a ten-minute expiry, five-attempt maximum and one-minute/five-per-hour resend limits. Delivery failure consumes that challenge so an unknown code can never be accepted later. Confirmation marks the user verified, consumes the challenge, revokes stale verification/reset tokens and, when changing address, revokes other sessions.

## Enforcement boundaries

- `/api/auth/session` and `/api/auth/code-email` intentionally accept an authenticated but unverified session so the person can recover verification.
- Account deletion, export and language preference remain available to a pending user; these are account-control operations, not workspace access.
- Dashboard, search, organization profile, files, notifications, teams and all role-protected workspace routes require verified identity.
- Customer, lead, price-book and team mutations additionally call `assertCanWrite` (and the relevant feature gate), preventing a client that bypasses the paywall UI from writing after trial/subscription expiry.
- AI endpoints enforce their persisted monthly plan counters server-side.

## Safe cleanup policy

No production cleanup is performed automatically. Pending users and their organizations are retained until an owner-approved retention policy exists. Any future cleanup job must be isolated, dry-run first, restrict itself to unverified accounts older than the documented retention window, exclude invited/team accounts and organizations with commercial records, and record an audit event. Deletion remains a separate authenticated, password-confirmed action with statutory/business-record retention review.

## Verification status

The state-machine decision is covered by unit tests in `tests/unit/auth-flow.test.ts`; pending-signup recovery is covered by `tests/unit/auth-service.test.ts`. Database-backed integration execution still requires an isolated PostgreSQL test instance. Production Resend delivery and real-device navigation remain external verification steps and are not inferred from these local tests.
