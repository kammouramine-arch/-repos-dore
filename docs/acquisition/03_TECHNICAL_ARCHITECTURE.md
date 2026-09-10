# 03 · Technical architecture

Web: Next.js App Router, React, TypeScript, Tailwind and Radix components. Mobile: Expo/React Native with Expo Router, native capture/sharing, SecureStore and Apple purchases. Exact resolved versions and declared licenses are in evidence/dependencies.json; package manifests describe direct dependencies.

Request path: web or mobile → API wrapper/validation → authenticated organization context → domain service → Prisma/PostgreSQL. Public quote and lead routes use opaque tokens and need separate access-control tests. Supabase hosts PostgreSQL; application authentication is custom session/token code, not automatically Supabase Auth.

Money uses integer cents and shared calculations. AI provider interfaces separate Gemini, Anthropic and local heuristics. Prompts and sanitization are in `src/lib/ai`; catalogue matching constrains commercial suggestions. Native speech recognition and optional server transcription are separate paths. Model output is untrusted and must be reviewed.

Billing: web Stripe checkout/portal/webhooks; iOS StoreKit through expo-iap plus server Apple signed-transaction verification. Product mapping lives in shared apple-products. Subscription DTO/entitlements must remain aligned across web/mobile; sandbox receipts are a beta-only operational exception.

Files: database, S3-compatible or local development storage behind `src/lib/storage`. Database blobs increase backup/database size; moving to S3 requires blob migration plus checksum/reference validation, not only changing one environment variable.

Major domains: User/Session/organization memberships, customers/leads, quotes/items/events, catalogue, follow-ups, subscriptions/usage, files, notifications and audit/analytics. `prisma/schema.prisma` is authoritative. Do not manually change generated SQL independently of migration history.

Operational boundaries: email, AI, payment and push failures must not become false successful business events. Follow-up cron is `/api/cron/relances`; Vercel schedule is `0 7 * * *` (UTC). Apple and Stripe webhooks are separate endpoints. See source-services inventory and README for route-level detail.

Known architectural risk: memory-only caches/rate limiting do not constitute distributed enforcement. Review each sensitive endpoint against shared persistent limits. No infrastructure-as-code ownership abstraction or complete data-erasure orchestration has been established.
