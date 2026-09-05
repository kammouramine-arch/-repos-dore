# Follow-up from build 8 device testing

## Release status — build 9
- User requested TestFlight delivery of the current partial update. Server deployed successfully: dpl_DKuphGk1yGYfNwtmgaSkDe9a7Wi5, stable alias https://devisia-bice.vercel.app. EmailChallenge migration applied successfully by hosting. Homepage returns 200; unauthenticated session endpoint returns 401.
- iOS build 1.0.0 (9): 891ce992-44f5-4821-916c-c2c2a256af08. Automatic Apple submission: 68350c98-1b2b-40dc-885a-b48dc468508f. Build started from current working tree (uncommitted changes included); Git metadata still references 1a4e321. Native build and Apple processing pending at this checkpoint.
- Release checks: full root production build, 181 unit tests, mobile typecheck/lint and complete iOS bundle export all passed. Test database integration setup remains unavailable; hosted additive migration did succeed.
- Explicitly disclosed to user: email delivery remains unconfigured, Apple sign-in and requested design refresh are not included. Mandatory email verification remains off, so testers are not locked out by missing delivery.

## Implemented in current update
- Native Mon compte screen is accessible from paywall and Plus, with independent name editing and emailed confirmation-code flow for verifying/changing email. Current email stays unchanged until confirmation; email changes require current password and revoke other sessions after confirmation.
- EmailChallenge additive migration stores code hashes, 10-minute expiry, five failed attempts, one-minute resend cooldown and five sends/hour. User-row locks serialize concurrent confirmations/resends. Send failures invalidate the matching challenge without updating login email. Old reset/verification links and pending codes are invalidated appropriately when credentials change.
- iOS email signup requests a code instead of a verification link. Mandatory pre-purchase verification gating is NOT enabled yet: configure real delivery and test recovery/restore before enabling this gate. Apple sign-in is still not implemented.
- Post-mutation session refresh now waits out older in-flight reads before fetching fresh account/subscription data, preventing reuse of a pre-purchase session snapshot.
- Quote email send fails before changing status, quota, contacts, or follow-ups if no sending provider is configured; regression test added.
- PDF table column geometry corrected; synthetic quote with €45.02 unit price, quantity 2 and 20% VAT rendered and visually verified.
- Apple subscriber dashboard no longer advertises choosing another plan during an already-active trial.
- Paywall redirects on newly activated subscription, offers sign-out, exposes introduction, and prevents a non-EUR purchase instead of misrepresenting an Apple USD charge.
- New signups enter presentation before subscription; unsubscribed connected navigation starts at presentation.
- Three-day promotional copy drafted in paywall; shared TRIAL_DAYS is now 3 and its unit test passes. Remaining consumer copy and actual native metadata still need auditing before release.

## External prerequisites
- User specified sender contact@amyn.agency. Resend login is open, awaiting user sign-in. Domain verification, DNS, sending key and production EMAIL_PROVIDER/EMAIL_FROM are not configured yet. Do not log or paste secrets.
- User explicitly approved replacing all three introductory offers. On September 5, 2026, Essentiel (6808994981), Pro (6808991416), and Entreprise (6808981897) each had their old one-week offer deleted and a France-only free three-day offer saved, starting September 5 with no end date. Each saved page was verified as "Free for the first 3 days". Plans and monthly prices were not changed; Apple states existing subscribers retain active introductory offers.

## Remaining requested work
- Apple three-day offers are configured on all plans. Still synchronize all copy and test actual StoreKit metadata and eligibility. Product duration metadata was overly strict previously; confirm actual native returned fields.
- Explain sandbox accelerated expiry and distinguish sandbox management from live App Store subscriptions. Do not invent expiry dates. Inspect French storefront/test account to explain USD.
- Account editing/code implementation is local; apply additive migration to a test database, run concurrent integration tests, configure real delivery, and verify signup/recovery on iPhone. Pre-purchase email-verification gate still pending. Add reauthentication support for Apple-only accounts when implementing Apple sign-in.
- Sign in with Apple: native capability and official button, backend JWT signature/issuer/audience/expiry/nonce validation, stable Apple subject binding. Never auto-link an existing account by unverified matching email.
- User asked for refreshed logo and premium design. Existing logo is code-native SVG; prefer coordinated vector source and exported app assets. No replacement created yet. Apple subscription artwork also still needs configuration.
- Configure real delivery and verify accepted/sent versus actually delivered semantics; do not claim receipt in inbox from provider acceptance alone.
- Full physical-iPhone signup/purchase/restore/email/AI flow and next TestFlight build remain pending.

## Verification
- 181 unit tests pass (13 new account-code cases). Root and mobile typechecks pass; mobile lint and targeted server/account lint pass. Root production build passed with new account routes; subsequent auth-token concurrency hardening passes typecheck.
- Two real-database integration tests added for concurrent code attempts and single-use consumption; require local PostgreSQL test database. Do not treat mocked unit tests as proof of database locking behavior.
- Running those integration tests failed in global setup: Prisma migration schema-engine error against 127.0.0.1:5432/devisia_test, including an escalated retry. No integration cases executed. No production migration or deployment performed this pass.
- PDF visual fixture: output/pdf/quote-layout-check.pdf. Fixture data only, not a real customer quote.
