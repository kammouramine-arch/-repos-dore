# DEVISERA premium finish pass — 7 September 2026

## Scope

This pass addresses the real-device feedback about the temporary service error,
startup feeling, and blue-to-white visual transition without changing stable
bundle identifiers, Apple product identifiers, database identifiers, or the
existing release profile.

## Code-side changes

- The mobile API client retries idempotent reads after transient HTTP 500/502/
  503/504 responses. Writes are still never replayed, so a quote or upload
  cannot be duplicated by the recovery path.
- Session restoration uses an eight-second budget. Cached session data remains
  available while a slow or unavailable network is represented as an explicit
  recoverable offline state instead of holding the native splash for the full
  request timeout.
- A standalone mobile runtime never quietly falls back to the developer's
  localhost endpoint. If a legacy binary has no API URL (or embeds localhost),
  it uses the stable production alias `https://devisia-bice.vercel.app`. New
  EAS builds still fail at configuration time when a production URL is missing
  or ephemeral, which prevents shipping a misconfigured binary.
- The checked-in EAS `production` profile now pins that same stable alias. This
  removes a hidden dependency on an EAS dashboard variable for the next build;
  replace it with the final `devisera.fr` API origin only after that origin is
  deployed and health-checked.
- Auth screens consume the persisted locale provider instead of recomputing
  the device locale, so French/English remains consistent after sign-out.
- Launch and authentication now share a native SVG blue-to-white premium
  gradient. The launch mark uses a short opacity/rise/spring sequence plus a
  restrained halo; it never delays route navigation.
- The authenticated home header uses the same light gradient surface with a
  rounded white transition. The floating tab bar, central create action,
  haptics, and reduced-motion behavior remain intact.
- The native splash asset is now `mobile/assets/splash-devisera.png`, with the
  DEVISERA wordmark. The previous `splash.png` is retained only as an unused
  legacy asset until a binary-safe cleanup can be performed.

## What this proves — and what it does not

The repository now has a safer retry and startup path, but a live device still
needs to confirm the production endpoint and authenticated API responses. The
reported temporary-service message can still be caused by a Vercel runtime,
database, AI, StoreKit, or email-provider failure; those causes cannot be
distinguished from this offline environment because outbound checks are
restricted and no production logs are available here.

## Device verification

On the next TestFlight build, verify cold launch, resume, sign-in, dashboard
refresh, quote creation, clients, photo/voice uploads, and subscription loading
on Wi-Fi and cellular. During a controlled offline test, the app should show a
recoverable connection state, preserve cached data, and never show a blank
white screen. Confirm the first native splash reads DEVISERA and that the
home/auth surfaces fade from blue into white without clipping or contrast
issues.
