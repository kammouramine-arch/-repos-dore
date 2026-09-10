# Production-fix pass and release blockers — 7 September 2026

This record captures the evidence from the latest DEVISERA release attempt. It is an engineering handover note, not proof of production delivery, email delivery, Apple approval, or legal compliance.

## Repository and commits

- Local branch: `codex/devisia-premium-fluidity`.
- Local HEAD after this pass: `52cabac`.
- `74f81f7` removes the build-time Google Fonts fetch so offline/CI web builds remain deterministic.
- `52cabac` reports already-accepted team invitations as `CONFLICT`, matching the integration contract and preventing a misleading validation error.
- Remote branch currently remains `d99e6d2593a75e34c05e558971c44d6ce0ea9a76`.
- Requested `9c88cd933ca9f60e3abfcd19221edbaf02bb2bbf` exists remotely and is one fast-forward descendant of `d99e6d2`, but the branch ref was not advanced in this session.

## Verification evidence

- Root TypeScript: passed.
- Mobile TypeScript: passed.
- Root ESLint: passed.
- Mobile Expo lint: passed.
- Unit suite: 27 files / 239 tests passed.
- Production web build: passed after removing the Google Fonts network dependency.
- iOS Expo export: passed (iOS bundle generated in a temporary export directory).
- Full integration suite: not completed locally because the isolated PostgreSQL test endpoint at `127.0.0.1:5432` is unavailable. The installed Windows service is not listening and cannot be started from this restricted session. The latest remote CI run reached 350/351 passing tests; its single failure was the already-used invitation error mapping fixed in `52cabac`.

## External release status

Live `/api/health`, authenticated signup/login/session/language/logout, real Resend delivery, Vercel Firewall logs, EAS build, and TestFlight submission were not claimed: the connected execution environment rejected outbound/network/browser operations because its usage limit is exhausted. No production secrets were printed or changed.

## Owner actions

1. From a terminal with outbound access, fetch and merge the existing remote fix without rewriting it, then push the branch:
   `git fetch origin 9c88cd933ca9f60e3abfcd19221edbaf02bb2bbf`
   `git merge --no-ff 9c88cd933ca9f60e3abfcd19221edbaf02bb2bbf -m "merge: include production Resend and firewall fix"`
   `git push origin codex/devisia-premium-fluidity`
2. In Vercel Production environment variables, set `EMAIL_PROVIDER=resend`, `EMAIL_FROM=DEVISERA <contact@devisera.fr>`, `EMAIL_REPLY_TO=contact@devisera.fr`, and the existing Resend key; redeploy without pasting the key into chat.
3. In Resend, verify the `devisera.fr` sending domain using only the DNS records Resend provides. Send a real verification email and confirm Delivered in Resend and in the recipient inbox.
4. In Vercel Firewall, inspect requests carrying `x-vercel-mitigated: deny`; narrow the offending rule with path/method exceptions for legitimate auth/session/account traffic rather than disabling protection globally. Re-test `/api/health`, signup, code-email, login, session restore, language update, and logout.
5. With the existing EAS credentials, run `cd mobile; eas build --platform ios --profile production`, wait for a finished build, then `eas submit --platform ios --profile production`. Install the resulting build through TestFlight and complete the real-device checklist in `16_RELEASE_AND_OWNER_ACTIONS.md`.

