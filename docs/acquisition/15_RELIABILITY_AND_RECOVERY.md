# 15 · Reliability pass and recovery evidence

6 September 2026. Implementation work in progress; not a declaration of production delivery or completed internationalization.

## Confirmed findings

- Client cards had no profile navigation. Only the phone icon was interactive. Added a protected client profile route, full-card action, separate phone action, contact details, editing and quote history. Quote creation receives the selected customer ID without waiting to display the creation screen.
- The client list used the default keyboard tap policy. Added `keyboardShouldPersistTaps="handled"` to prevent a first tap being consumed solely to dismiss search.
- The bottom bar captured horizontal movement after 6 px, cancelling the child press. Deliberate scrub threshold is now 20 px; 0–19 px jitter stays with the button. Added regression tests. This is a confirmed competing gesture path, not proof that it explains every reported device failure.
- Creation navigates to a single destination rather than repeatedly pushing the same route. Press feedback is immediate. Native speech capability checks no longer execute on every text render and cannot throw out of render.
- Client picker requests could resolve out of order or after closing. Added version guards and a retry control, and no longer labels a failed lookup as “no clients”.
- Added recoverable rendering boundaries to creation and client profile. The underlying reported native white screen is **not yet reproduced**. A boundary does not catch every native crash or async failure.
- Assistant fallback ignored recorded rejected quotes. It now uses tenant-scoped recorded outcomes rather than replying with unrelated pending totals.

## Tests and measured evidence

- Latest full database/unit run: **300/300 tests across 37 files passed**. Root typecheck and lint, mobile typecheck and lint passed. iOS bundle export succeeded.
- Measured iOS export after direct Ionicons imports: Hermes bundle **3,589,032 → 3,251,333 bytes**; complete exported files **7,691,837 → 3,665,870 bytes**; modules **1,472 → 1,418**, assets **42 → 24**. This is a bundle-size comparison, not a device launch-time measurement. EAS archive/IPA compression will differ.
- Customer profile API now selects lightweight quote fields and job count, avoiding unrelated invoice/payment/conversation/message loading. Tenant isolation and draft-versus-sent totals have integration coverage.
- Production environment-name audit confirmed no `EMAIL_*` or `RESEND_*` settings in the linked Vercel project. Live delivery remains blocked, not repaired by test mocks. Owner was asked to sign into Resend and the sender domain DNS provider.

- Later browser run: **10/10 end-to-end cases passed** across desktop Chromium and mobile-sized Chromium. Includes three-day trial/expiry, protected routes, creation, PDF and public reading. Unconfigured email is asserted to fail; the subsequent public-reading stage uses an explicit local database fixture, not a fake delivery claim. Native StoreKit and native iPhone gestures are not covered by Chromium.
- Personal account export added at `/api/auth/export` and mobile account settings. Allowlisted identity/membership data, no-store response, authenticated account scope; two integration cases verify fields and nonexistent-account rejection. Commercial-record export and automated deletion remain open.
- Memory-only diagnostic ring records up to 80 API area/duration/error-category events and rendering failures. User can explicitly share from Settings. No automatic third-party telemetry, request bodies, URLs, client IDs or exception messages are collected. This does not capture native process crashes or upload timing yet.
- Added and unit-tested an independent language/country formatting foundation in shared `business-locale.ts`. Organization already has locale/country/currency/timezone fields and User has locale. Full mobile translation, language preference UI, AI/email/PDF integration and safe region selection remain unfinished; no international production readiness is claimed.

- Full suite: **289 tests / 34 files passed**, including PostgreSQL integration, after explicit test-email transport replaced the obsolete console-success assumption in the journey fixture. This is NOT a live-delivery test.
- PostgreSQL 17 was already installed under `C:\Program Files\PostgreSQL\17\bin` but absent from PATH. Created an isolated cluster under ignored `output/postgres-test`, listening only on `127.0.0.1:55432`. Existing installation data and production were not touched.
- All five migrations applied cleanly to that empty test database.
- `scripts/database-backup.mjs` creates custom-format archives and SHA-256 manifests without putting connection values in arguments/logs. No overwrites; restore accepts only loopback databases ending `_restore_test`, uses one transaction and does not delete existing objects.
- Recovery rehearsal: seeded isolated demo database, dumped it, restored to `devisia_demo_restore_test`. Recovered **4 customers, 5 quotes, 17 quote items, 5 migrations**. This is a demo-data/schema recovery, NOT a production recovery or proof of external object recovery.
- No measured iPhone frame rate, cold-start timing or before/after API percentile is available yet. Do not advertise a performance improvement percentage.

## Repeat local integration tests

Web signed-out navigation: pages now use a page-specific authentication wrapper that redirects on expected missing sessions; API routes retain JSON 401 responses. Previously the page threw an AppError while its concurrently rendered layout redirected. The final browser E2E rerun passed **10/10 in 42.2 seconds**, with that runtime AppError absent. Build-tool deprecation/color warnings still remain; this is not a claim of zero warnings everywhere.

Latest extension: **305 tests / 38 files passed**. The server now persists personal language separately from company country/currency/timezone and exposes it in session responses; the existing web language switch persists it too. Backward-compatible cached sessions default to French. This does not enable a completed English mobile UI. Photo loading now runs concurrently with profile/catalogue reads before AI generation; no physical-device speed percentage is claimed.

Follow-on verification: **303 tests in 37 files passed**, root/mobile type checks and lint passed. Added regression cases for a late old-session 401 (JSON and photo upload) not disconnecting a new login. Client profiles now include the latest 30 recorded quote events and 30 jobs; events expose no IP hashes, actor identifiers or internal metadata. Additional profile history is not proof that an email reached an inbox. The internal dashboard no longer labels catalogue-price totals as MRR or truncates its company count at 50.

Use the installed PostgreSQL tools or an equivalent PostgreSQL 17 instance. Initialize a separate data directory, bind loopback, create `devisia_test`, then set `TEST_DATABASE_URL` to that local database and run `npm test`. Both migration connections are explicitly set to that test database. Never use the production URL. CI now includes an ephemeral PostgreSQL service.

## Backup and restore runbook

1. Select an approved encrypted workstation/volume. Archives contain personal data and are NOT encrypted by the script.
2. Securely supply `BACKUP_DATABASE_URL` (direct/session connection suitable for pg_dump), and optional `PG_BIN` directory. Do not paste credentials into tickets or source control.
3. Run `node scripts/database-backup.mjs backup unique-name`. Output is under ignored `output/backups`; check command success and retain its manifest.
4. Copy archive and manifest into approved access-controlled encrypted off-site storage. Establish retention and access owners before backing up production.
5. For a rehearsal, create a NEW isolated local database ending `_restore_test`. Set `BACKUP_DATABASE_URL` to that target, then run `node scripts/database-backup.mjs restore-test unique-name`.
6. Verify migration count, tenant/customer/quote/item counts, referential integrity, login, representative PDF/file access and business flows. Record timing, RPO and RTO using the actual rehearsal, not estimates.
7. Database-backed file blobs are inside database dumps. S3/local object files, provider secrets/configuration and Apple/Stripe/email service state are not. Back those up separately if used.
8. Production recovery remains a controlled owner-approved maintenance operation: take a safety snapshot, pause writes/jobs, restore to a replacement project, validate before switching traffic, then rotate affected credentials. The script deliberately cannot restore to production.

OWNER ACTION: verify the actual Supabase backup/PITR entitlement and retention, appoint a backup custodian, choose encrypted off-site storage and approve the retention policy. Do not treat this local archive as production disaster recovery.

## Focused physical iPhone acceptance tests

Record device/iOS/build number and network, then repeat each 10 times:

- Tap + normally and with slight thumb movement; creation must appear with no second tap. Deliberate bottom-bar drags must still select tabs.
- Rapidly tap + three times; back navigation must not reveal stacked identical creation screens.
- Search clients with keyboard open, tap a row once, verify correct profile. Phone icon must not also open the profile.
- Edit identity/contact/notes; return to directory and reopen. Create a quote from profile and verify its selected customer before saving.
- Cold launch, warm reopen, background during data fetch, airplane mode, slow network, restore connectivity and retry.
- Voice and photo creation; deny permissions and retry; leave while dictating; revisit creation without force-closing.
- Logout/login as a different account: no other customer's cached information may appear.
- Record any white screen with timestamp and preceding gesture. Rendering recovery is not verification of native crash recovery.

FR/EN and FR/UK/US scenarios remain pending implementation and must not be marked passed based on the French-only changes here.
