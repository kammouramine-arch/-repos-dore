# Team continuation — 6 September 2026

This checkpoint records the workspace implementation added after the earlier entitlement audit. It is not a public-launch or legal certification.

## Implemented

- Commit `1eb2e40` adds server-side team invitations, hashed seven-day tokens, role enforcement, seat checks, resend/cancel/remove flows, invitation acceptance and invited-user signup.
- Pro includes three seats and Enterprise includes ten seats. Essentiel remains a single-user plan.
- AI/usage counters remain organization-scoped, so seats share the plan allowance.
- Business export now requires the owner or administrator permission. Personal export remains account-scoped.
- Final-owner deletion is blocked until workspace ownership is transferred; this avoids leaving a commercial workspace without an accountable owner.
- Team settings are no longer a read-only placeholder: owners/admins can invite, resend and cancel; owners can change roles; authorized roles can remove members.

## Verification

- Root typecheck: passed.
- Root lint: passed.
- Unit suite: 22 files / 211 tests passed.
- Root production build: passed; `/app/parametres/equipe`, `/invitation/[token]` and all team API routes compiled.
- Mobile typecheck: passed.
- iOS Expo export: passed (Hermes bundle produced; EAS archive was not run here).
- Focused lint for all new server/team files: passed.
- Full integration suite: **BLOCKED** because PostgreSQL is not available at `127.0.0.1:5432` in this environment. No integration pass is claimed.
- Full Expo lint: **BLOCKED BY ENVIRONMENT** by the known Windows `EPERM` scan from `eslint-plugin-import` while resolving the workspace path; focused changed-file lint passes.

## External gates

GitHub API read confirms commits `a45204d` and `4847fc8` exist as objects in `kammouramine-arch/-repos-dore`, but the connected branch ref currently points to `d1438f6`; terminal network permission is unavailable and the browser automation surface is not configured. The new local commit is therefore not claimed as remotely pushed. Manual push from the repository checkout is required before the next EAS build.

Production Resend delivery still requires `devisera.fr` domain verification and Vercel production environment values. Apple App Store metadata, payment-sheet display branding, subscription products and TestFlight physical-device acceptance remain owner/account actions.
