# Follow-up from build 8 device testing

## September 7 — startup incident, launch sequence, gradient (deployed as d99e6d2)
- Deployed and verified: correct-password sign-in 200 (was 500); the ignored variable was `EMAIL_REPLY_TO` in display-name form, now accepted and used. Transcription `false` is expected (on-device iPhone dictation). Remaining, outside app code: Resend refuses verification-code sends (reason now logged, domain status in health) and the Vercel Firewall intermittently denies writes (`x-vercel-mitigated: deny`). Probe accounts cannot self-delete (owner transfer rule) — clean with `db:clean:supabase`.
- Production reproduced: `/api/health` 503 in 1 ms, sign-up and correct-password sign-in 500 while a wrong password returns 401 — the database answers; `env()` threw on the whole schema for one invalid optional variable. See `docs/acquisition/34_STARTUP_INCIDENT_LAUNCH_AND_GRADIENT_PASS_2026-09-07.md`.
- `env()` now degrades optional settings and names them; `/api/health` reports configuration, database, email and AI separately; unhandled errors carry a `requestId` in body, header and log.
- Mobile: launch overlay held over the mounted app (native splash now blue with the same mark), circular reveal into the home whose top is the same blue; outage screens distinguish network from server with the reference; diagnostics carry path/status/category/reference.
- Gradient rebuilt as a ten-stop atmospheric fade covering ~64 % of the screen; home header no longer a card.
- Owner actions: deploy, read `checks.configuration.ignored`, fix the named variable, delete probe account `zz-sonde-devisera-1788795345@example.com`, then one EAS build and physical iPhone check.

## September 6 — video-driven corrections, pending device QA
- Build 13 completion verified September 6: EAS FINISHED, submission FINISHED with error null, Apple upload Complete and DEVISERA Internal assigned. Apple build e1ed04ff-8a9c-4810-b724-7b8cf3f3af06. Follow-up paused. Acquisition-pass changes after build 13 are not included in this binary.
- Build 13 uploaded (5 MB), EAS 72d0fa5d-7364-4341-baad-3e60a6067352, automatic submission 05424e78-2d2c-4362-a938-2c0ce5426e25 scheduled. Heartbeat updated to monitor completion. Not yet available on device.
- Packaging incident: first attempt reserved build number 12 and uploaded a 39.2 MB source archive including local output/video-analysis artifacts. Interrupted before build creation; build:list confirmed only 11/10 existed. Added /output/ to root .gitignore, verified contact sheets/decoder excluded, then retried successfully at 5 MB. User informed; cannot claim the earlier uploaded orphan archive was deleted from Expo. No original attached video was copied into the repo, but extracted contact sheets were in output.
- Inspected both attached recordings via local frame contact sheets. Instagram reference shows a bottom-bar thumb scrubbing continuously while content stays put; earlier full-page-pager interpretation was incorrect. Replaced the adjacent-tab swipe wrapper with a custom continuous thumb bar, direct destination selection on release, cancellation outside the bar, accessible tap alternatives, and protection against dragging into the create-quote action. Keyboard hides the custom bar. Reduce Motion disables settling springs. Native iPhone gesture QA remains required.
- DEVISERA recording shows dashboard chrome promptly, followed by roughly five seconds of dashboard skeleton, rather than a five-second splash. Added an encrypted 24-hour dashboard display snapshot bound to the exact login token, restored without overwriting a fresh network response. Sign-out deletes it; labels distinguish last-known data from live refresh. This improves returning-user perceived loading, not proven server response latency. First uncached load still needs profiling.
- 192 unit tests pass, including scrub destination and snapshot token/expiry tests. Mobile typecheck/lint and iOS export passed; no measured device improvement claimed yet.
- Apple distribution draft had no attached build and displayed a placeholder icon. Attached existing validated build 11 and saved (no review/public submission). After reload, App Store Connect header visibly shows the blue DEVISERA D. Native TestFlight purchase-sheet icon propagation still needs device verification.

## Build 11 — submitted for cloud build
- Completion verified: EAS build FINISHED, submission FINISHED with error null. Apple upload Complete, build acec8d0c-9686-43d2-b84d-213cfe1384f8, assigned to DEVISERA Internal. Available for internal testing; not submitted for public release. Follow-up paused after verification.
- User explicitly approved source upload to Expo and automatic Apple TestFlight submission. Uploaded successfully September 5, 2026. EAS build 90c5100b-1484-421e-885d-52d89edb07be, version 1.0.0 (11); automatic submission f10eddd3-0bb4-459e-aede-52d37b0495ce scheduled. Completion and Apple tester availability not yet verified.
- Includes the navigation/touch polish and clearly labeled French reference pricing below. Purchase-sheet logo remains unresolved. Preflight rerun: 186 unit tests passed, mobile typecheck and lint passed.
- Heartbeat follow-up scheduled to verify build, submission and availability; do not launch a duplicate build.

## Native purchase-sheet icon investigation
- User clarified the missing artwork is above the product name in Apple's Double Click to Subscribe sheet, not inside our paywall. A screenshot is not required to identify the affected surface.
- Verified app.config.ts points to assets/icon.png and visually checked the blue/white DEVISERA D asset. PNG is 1024 x 1024, 8-bit RGB without alpha. No placeholder replacement is needed in this source asset.
- App Store Connect build 10 metadata reports Validated and the expected fr.devisia.app bundle ID. This does not by itself verify the artwork rendered on the device purchase sheet.
- Essentiel's empty optional subscription image is described by Apple's UI as artwork for win-back offers, offer-code redemption and App Store promotion. No evidence that uploading it fixes this standard purchase sheet; did not change it speculatively.
- A developer report at https://developer.apple.com/forums/thread/702503 describes the same missing pre-release purchase-sheet icon and reports support saying it appears after release. This is a third-party report, not confirmation for DEVISERA. Suspected sandbox/pre-release behavior remains unverified; do not promise public release will fix it or launch publicly just to test it.
- No code or Apple configuration change made for this investigation. Icon issue remains open for device/release verification or Apple Developer Support. Navigation polish below remains unreleased.

## Navigation polish after build 10 — local, not released
- Continued polish: safe-area-aware bottom bar height/padding and rounded top corners; swipe bounds follow actual bar height instead of a hardcoded strip. Shared spring feedback now covers buttons, cards and settings rows, resets when Reduce Motion changes, and does not delay actions. Plan cards keep a constant border width to avoid selection layout jumps and are disabled during purchase processing.
- Extracted navigation gesture rules with five new unit tests: skips quote action, no edge wrap, ignores hidden routes, small gestures and content/vertical drags. Full unit suite: 186 tests passed. Mobile typecheck, lint, iOS bundle export and diff checks passed. Physical-device appearance/gesture testing still pending; no new TestFlight build issued in this pass.
- Selected tab icons gently spring to 1.1x with a two-point lift and accent background; selection haptics and native shift transitions. Reduce Motion disables scale/shift animations.
- Horizontal swipes beginning on the bottom bar switch Accueil / Prospects / Clients / Plus, excluding the create-quote action. Gesture capture is confined to the bottom strip to preserve screen scrolling/forms. This is release-triggered tab switching, not an interactive full-screen pager. Needs physical-device gesture and safe-area QA.
- Euro headline prices show actual Apple EUR prices when available; otherwise explicitly labeled France reference prices. The actual non-EUR Apple amount remains visible separately before purchase. Never relabel USD as EUR. No currency purchase block reintroduced.
- Mobile typecheck and lint passed. Not included in build 10. Apple purchase-logo issue not resolved: inspected Essentiel subscription, optional image empty; UI explicitly describes offer-code/win-back/promotion usage, not proof it fixes the standard purchase sheet. Asked user for a redacted screenshot of the exact missing-logo screen.

## Build 10 — subscription blocker regression
- User reported blank prices and disabled Subscribe in build 9. Root cause: our EUR-only render/purchase guard, not a missing Apple product. Removed currency gating; preserve Apple's displayPrice, show currency code for non-EUR, and explain final confirmation without asserting the tester's account country is wrong. Missing products/prices, pending actions and non-owner role still disable purchase.
- Intro plan cards now have a visible choose action and open the chosen plan on the paywall for connected users. Reference French prices are labeled as such.
- Mobile typecheck, lint, iOS bundle export and diff checks passed. No server changes needed. Native build 4f9659c5-d8b9-478a-8d0b-836288099997 FINISHED, submission 9ae4ad7e-ec98-4331-afd2-6bd6434396f9 FINISHED with error null, version 1.0.0 (10). Apple processing Complete, build 176cdadf-3b74-47c6-be11-a17db1fadfa0, assigned to DEVISERA Internal. Actual iPhone purchase confirmation still needs device testing.
- Confirmed research: RevenueCat's official Apple sandbox documentation explicitly describes USD metadata in TestFlight with a potentially localized Apple purchase sheet. Do not hardcode EUR onto a USD charge or require changing the user's real account country to proceed.

## Release status — build 9
- User requested TestFlight delivery of the current partial update. Server deployed successfully: dpl_DKuphGk1yGYfNwtmgaSkDe9a7Wi5, stable alias https://devisia-bice.vercel.app. EmailChallenge migration applied successfully by hosting. Homepage returns 200; unauthenticated session endpoint returns 401.
- iOS build 1.0.0 (9): 891ce992-44f5-4821-916c-c2c2a256af08 FINISHED. Automatic Apple submission: 68350c98-1b2b-40dc-885a-b48dc468508f FINISHED, error null. Build started from current working tree (uncommitted changes included); Git metadata references 1a4e321, code subsequently recorded in 5a19ae3. Apple processing COMPLETE, build ada5336c-f012-4444-b043-a035bf00ede3. Verified assigned to DEVISERA Internal (Internal, 1 tester). French testing notes added with known limitations. Ready for the existing internal tester to install through TestFlight.
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
- User specified sender contact@devisera.fr. Resend login is open, awaiting user sign-in. Domain verification, DNS, sending key and production EMAIL_PROVIDER/EMAIL_FROM are not configured yet. Do not log or paste secrets.
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
