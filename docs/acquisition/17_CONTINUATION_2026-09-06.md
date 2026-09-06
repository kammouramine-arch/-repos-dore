# Continuation — 6 September 2026

## Implemented in commit `a45204d`

- The mobile tab navigator keeps screens mounted and disables interrupted tab-transition/freeze behavior. The central `Créer` action now navigates directly to the real creation screen instead of a redirect-only route.
- Tab navigation records bounded, non-identifying commit timings in the existing local diagnostic export. This is intended to separate navigation delay from API delay during real-device QA.
- Shared entrance animations no longer hide content at first paint when a native animation is interrupted.
- Authentication surfaces use a shared blue-header/white-surface layout. Long password guidance wraps naturally, and login/signup submission guards prevent duplicate taps.
- Password reset no longer reports a successful email delivery after a transport failure.
- Onboarding's fifth screen is informational; the user selects a plan once on the subscription screen. Progress bars are derived from the actual five-slide count.
- Added an authenticated, permission-checked business export at `GET /api/organization/export`. It includes customers, leads, jobs, quotes and line items, invoices and business-profile basics, while excluding sessions, tokens, secrets and provider configuration.

## Verification

- Root TypeScript check: passed.
- Mobile TypeScript check: passed.
- Unit suite: 21 files / 206 tests passed.
- Local 375×667 preview: login and signup content visible; password guidance fully wraps.

## Still requiring external/device action

- The iOS EAS build and TestFlight submission must be run with network/build credentials available. The build command could not be authorized in this session because the execution environment hit its usage limit; no claim of a new TestFlight build is made here.
- Real iPhone QA is still required for cold start, background/resume, native keyboard, StoreKit purchase sheet, camera/photo permissions, and the original blank-tab reproduction.
- Production email still needs Resend sender verification and DNS access; no secret or DNS value is stored in this repository.
