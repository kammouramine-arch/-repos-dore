# 04 · Setup, deployment and recovery

## Local developer setup

Rehearsed 9 September in a separate detached worktree without production secrets: root/mobile `npm ci`, explicit Prisma generation, six migrations and 478 unit/database tests succeeded. Prisma engine download requires network access even when packages are cached. Mobile postinstall applies both committed patches. Set `E2E_DATABASE_URL` to an isolated loopback test database for browser tests; the owned server now exits via private IPC rather than a Windows shell process tree. See the current release ledger for final evidence and remaining production/device gates.

1. Obtain repository access through your own account. Install a compatible Node runtime (root engines requires at least 20.9), npm and PostgreSQL. Use lockfiles, not unpinned package upgrades.
2. Run `npm ci` at root and in `mobile/`. Mobile postinstall applies committed patches. Review patches on upgrades.
3. Copy `.env.example` to a private local env file and populate locally. Use a dedicated local database and local/mock AI/email for rehearsal. Never reuse production connection strings in tests.
4. Run `npm run db:generate`, `npm run db:deploy`, then `npm run dev`. Check `/`, `/tarifs`, `/connexion` and authenticated routes.
5. For synthetic demo fixtures use a local database whose name contains `demo` or `test`, set `DEVISIA_ALLOW_DEMO_SEED=true`, then `npm run db:seed`. This resets the demo identity/organization, so use an isolated database. The seed refuses production and remote hosts. The documented demo password in seed source is public fixture data, never a live credential.
6. Mobile: configure EXPO_PUBLIC_API_URL to a backend reachable from the phone, run `npm start` in mobile. A physical device cannot use the PC's localhost. Native purchase testing requires a signed development/TestFlight build, not browser simulation.

## Verification commands

Root: `npm run test:unit`, `npm run typecheck`, `npm run build`. Mobile: `npm run typecheck`, `npm run lint`, `npx expo export --platform ios`. Integration: `npm test` with the isolated test database from tests/global-setup.ts. E2E: `npm run test:e2e` after its prerequisites. Seed/schema setup failures mean tests did not execute; do not report them as passed.

## Production release

Use an approved change/backup window. Review migrations, create a backup and test rollback strategy first. `vercel.json` runs `scripts/migrate-hosted.mjs` before Next build; this mutates the configured database. The script uses a matching Supabase session pooler when direct IPv6 is unavailable. Do not use transaction-pooler migrations. Deployment permission is not permission to reset a database.

Check stable APP_URL, native API URL, external provider credentials, webhook signatures, cron secret and file provider before promoting. Validate login/AI/PDF and a controlled delivery after deployment. Code rollback cannot undo an incompatible migration; prefer additive changes and a forward fix or rehearsed restore.

iOS: from mobile run `npx eas-cli build --platform ios --profile production --auto-submit --non-interactive --no-wait` after owner authorization for Expo source upload. Confirm archive excludes output, recordings, secrets and credentials. Confirm EAS completion, Apple processing and internal tester assignment separately. App Store public review is a separate owner-approved workflow. Disable beta sandbox access and redeploy before public launch; test production entitlements.

## Backup / restore acceptance

Owner must verify database backup plan, retention, encryption, region, RPO/RTO and billing. Restore into an isolated project, inspect migration history, row counts, sampled quote totals and tenant boundaries; restore private files separately when not database-backed. Verify object checksums, links and credentials. Disable cron/email/push/billing in the restore environment. Record elapsed restore time and observed data loss window before promising an SLA. No restore drill has been completed by this package.

## Troubleshooting

AI/network error: correlate timestamp and route with redacted server logs, provider availability and timeout budgets; do not expose prompts/customer photos. Empty Apple offers: inspect product IDs/storefront/eligibility, not hardcoded currency labels. Missing delivery: verify provider availability and sender DNS, then acceptance/bounce events. Startup skeleton: distinguish network data wait from native launch; cached data is not fresh data. Missing purchase artwork: draft build attachment fixed the App Store Connect header; native payment sheet remains device-verification dependent.
