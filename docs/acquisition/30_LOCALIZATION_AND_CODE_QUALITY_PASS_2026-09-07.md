# DEVISERA — localization and code-quality pass

Date: 7 September 2026  
Scope: the local mobile/web repository only. No external account or production secret was changed.

## Completed in this pass

- Added a mobile locale provider that follows the persisted account language and falls back to the device locale before sign-in. The choice is retained in secure device storage across logout/login and restart, while the server preference remains authoritative after session restoration.
- Completed English copy for the mobile shell, onboarding/presentation, quote creation questions, clients and client profile, leads, catalogue, analytics, account, subscription, errors, loading states, dynamic counters, and accessibility labels. Common API error messages are translated at the mobile boundary as a safe fallback.
- Localized native stack titles and back labels so English users never see French navigation chrome or an internal `(app)` label.
- Localized native dictation and photo-capture messages, including iOS permission and upload recovery states.
- Passed the signup locale to the API and persisted it on the user record; existing users retain French as the safe default.
- New organizations inherit the signup language; when an owner changes language, the organization document/email locale is synchronized while team members retain personal UI preferences.
- Added a mobile business-region selector (France, United Kingdom, United States) with country-aware identifiers, tax labels and postal-code terminology. Language and business country remain independent.
- Kept language independent from business country. Server-side quote PDFs now localize headings, tax labels, company identifiers, discounts, exemptions and money/date formatting for the organization’s FR/GB/US profile. AI prompts, heuristic fallbacks, voice transcription, follow-ups and transactional emails use the selected language while preserving the business country and currency.
- Added regression coverage for secondary mobile strings, dynamic labels, navigation titles, and FR/GB/US document terminology/currency.
- Added a project-scoped mobile ESLint workaround for the Windows `import/no-unresolved` EPERM traversal. TypeScript path resolution remains enabled; the workaround does not scan outside the repository.
- Added an ignore rule for the disposable local iOS export directory so generated build output cannot be committed accidentally.

## Verification evidence

| Check | Result |
| --- | --- |
| Root TypeScript | PASS |
| Mobile TypeScript | PASS |
| Root ESLint | PASS |
| Mobile ESLint (`expo lint`) | PASS |
| Unit suite | PASS — 23 files, 218 tests |
| Production web build | PASS — Next.js generated all routes |
| iOS Expo export | PASS — Metro bundled 1,421 modules; output was disposable and ignored |
| `git diff --check` | PASS |

`npx expo-doctor` was not available offline: npm attempted to fetch the package and the
restricted Windows environment returned `EACCES`. The repository-scoped Expo export and
mobile type/lint checks completed successfully.

## PostgreSQL integration-test blocker

The full `npm test` run reaches the integration global setup but cannot migrate the isolated test database because the repository’s safe default is:

```text
Local test database: 127.0.0.1:5432/devisia_test (credentials supplied privately through TEST_DATABASE_URL)
```

Read-only checks found:

- Windows service `postgresql-x64-17` is running and accepts connections on `127.0.0.1:5433`.
- Nothing is listening on `127.0.0.1:5432`, which is the port used by the test harness.
- The service credentials/database were not changed or guessed in production.
- A disposable repository-local cluster attempt was not completed because the execution environment rejected the provisioning command after its usage limit was reached.

Therefore integration tests remain **BLOCKED BY LOCAL ENVIRONMENT**, not by an application assertion. No production database was contacted.

## Deliberately not performed

The requested EAS/TestFlight build was intentionally not started in this pass because the owner explicitly asked to finish all code-side work before creating one final build. Pushing to GitHub, EAS, App Store Connect, Resend/DNS, and physical-iPhone acceptance remain external release actions.

## Remaining classifications

### Complete / technically improved

- English mobile product coverage and persisted language selection.
- FR/GB/US document terminology and currency logic with tests.
- Mobile lint and typecheck reliability on Windows.
- Navigation title hygiene and accessible one-tap labels.

### Blocked by external or host state

- Real inbox delivery for verification and quote emails requires the production Resend domain, DNS and a real recipient test.
- Apple storefront availability, EUR pricing, payment-sheet branding, and TestFlight processing require App Store Connect/TestFlight.
- Physical iPhone performance, background/resume and poor-network checks require the owner’s device.
- Git push and EAS build require outbound access/usage capacity in the release environment.
- Full integration suite requires a test PostgreSQL listener on port 5432 (or an explicitly supplied isolated `TEST_DATABASE_URL`).

### Owner actions before release

1. Provide/verify an isolated PostgreSQL test database or run the suite with `TEST_DATABASE_URL` pointing to a local database on port 5432; never use production credentials.
2. Verify `contact@devisera.fr` in Resend and publish the required DNS records, then send one signup and one quote to a real inbox and retain delivery-log evidence.
3. Run the final Git push and one EAS production iOS build after this commit; submit the resulting build to TestFlight and complete the real-device checklist.
4. Confirm Apple App Store Connect subscription localization/storefront and payment-sheet branding before public release.
