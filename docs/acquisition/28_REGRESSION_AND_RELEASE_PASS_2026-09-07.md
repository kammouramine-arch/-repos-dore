# DEVISERA — regression and release pass (2026-09-07)

## Scope completed locally

- Signup verification delivery failures are no longer swallowed. The API now
  returns a typed provider error when Resend is unavailable or rejects the
  message; the mobile client does not enter a misleading “code sent” state.
- Verification resend/expiry/attempt handling remains server-side and covered
  by the existing account-service tests.
- Added a secret-free `GET /api/health` probe reporting database reachability
  and whether the configured email provider is Resend, without returning keys.
- Removed the mobile Apple paywall’s hard EUR-only button lock. StoreKit’s
  localized display price is shown as returned; a non-EUR sandbox storefront is
  called out as a storefront/configuration warning rather than presented as a
  missing French offer. No conversion is performed in the app.
- Added a floating bottom navigation barrier with a moving selected indicator,
  central creation action feedback, haptics, safe-area handling, and localized
  labels.
- Added persisted French/English copy for native auth, verification, account,
  clients, client profile, dashboard shell, workspace, and Apple subscription
  surfaces. The selected server preference continues to drive generated AI,
  email, and documents.
- Added account entry points for Apple subscription management, purchase
  history, rating, and support contact. Support mail includes only non-secret
  diagnostic context.
- Removed the visible `(app)` route-group fallback by explicitly naming the
  parent stack and all nested back buttons.

## Verification evidence

| Check | Result |
| --- | --- |
| Root TypeScript | PASS |
| Mobile TypeScript | PASS |
| Unit suite | PASS — 22 files, 211 tests |
| Web production build | PASS |
| iOS Expo export | PASS — Hermes bundle generated |
| Full integration suite | BLOCKED — PostgreSQL test service is not listening on `127.0.0.1:5432` |
| Mobile ESLint | BLOCKED by Windows `EPERM` while `eslint-plugin-import` scans `C:\Users\Amine` |
| Real iPhone / inbox delivery | NOT VERIFIED from this environment |

## External release boundary

The working tree contains the tested local commits, but outbound network
escalation for GitHub/EAS was rejected by the execution environment after the
account usage limit was reached. Therefore this pass does **not** claim that the
new code is deployed, that Resend accepted a real message, or that a new
TestFlight build exists.

## Owner action required

1. From the repository root, run `git push origin codex/devisia-premium-fluidity`.
2. In `mobile`, ensure the EAS production environment contains the stable
   HTTPS `EXPO_PUBLIC_API_URL`, then run `eas build --platform ios --profile
   production` and submit the resulting build with `eas submit --platform ios
   --profile production`.
3. In production hosting, set `EMAIL_PROVIDER=resend`, add the Resend key as a
   secret, and keep `EMAIL_FROM=DEVISERA <contact@devisera.fr>` and
   `EMAIL_REPLY_TO=contact@devisera.fr`.
4. Verify `devisera.fr` in Resend and publish the exact SPF/DKIM records it
   gives you. Keep existing MX records unchanged unless your mail provider
   explicitly directs otherwise.
5. Open `/api/health` after deployment. It must return `status: "ok"`,
   `database: "ok"`, and `email.configured: true`.
6. Create a fresh account with a real inbox, confirm the code arrives, then
   test login, resend cooldown, invalid/expired codes, quote email delivery,
   and the French EUR storefront on the new TestFlight build.

## Honest status

This document records code and verification work that is complete locally. It
does not replace the external delivery, inbox, Apple storefront, or physical
iPhone checks above.
