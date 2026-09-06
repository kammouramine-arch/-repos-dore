# Technical continuation — 6 September 2026

This note records the work completed after the strict 66/100 acquisition checkpoint. It is evidence, not a claim of App Store approval, legal compliance, or physical-device acceptance.

## Completed in the repository

- AI quote generation now receives an explicit locale/country/currency directive from the business profile. French remains the default; English output is requested for English profiles without conflating English with a specific country.
- The assistant service carries the organization locale into its system prompt.
- Deterministic assistant fallback answers now recognize common English questions and return English labels, dates/amounts and actions when the account language is English; French remains the default.
- Automated follow-up generation supports English subject/body fallbacks and locale-aware currency formatting while preserving the existing French templates.
- Customer quote emails and follow-ups now honor the organization language/country/currency, including English regional date and money formatting and an English email footer.
- Quote PDFs now select regional headings, date formats, currencies, VAT wording, and acceptance copy from the organization profile. France remains the default path; quote-time legal snapshots and visual fixtures are still required before making a compliance claim.
- The mobile account screen now persists a Français/English preference through the existing authenticated language endpoint.
- Unit coverage verifies that English output is independent from GB/US country selection, that the AI prompt includes the selected regional context, that the English fallback does not leak French labels, and that PDF terminology distinguishes GB QUOTE from US ESTIMATE.
- Business export and authenticated account deletion now have integration coverage. The deletion test verifies confirmation/password enforcement, personal-field anonymization, membership soft-deletion, and the explicit retention of business records.
- Mobile startup now emits bounded, memory-only diagnostics for root readiness and launch animation settlement. Events contain only area, duration, status code, and timestamp; no user, quote, or customer identifiers are recorded.

## Verification run

- Root TypeScript: passed.
- Mobile TypeScript: passed.
- Unit suite: 22 files, 211 tests passed.
- Integration suite: added coverage, but execution still depends on a reachable test PostgreSQL database and the configured test environment. No claim is made that it ran successfully in this environment until that dependency is available.

## Still incomplete or externally blocked

- The mobile interface is not fully translated; a repository scan still finds several hundred French UI strings. The persisted selector is now present, but a complete English copy pass remains required.
- Email delivery still requires the owner’s Resend sender verification and DNS records for `contact@devisera.fr`, followed by an inbox test.
- Regional PDF rendering still needs quote-time snapshots and visual FR/UK/US PDF fixtures; the renderer now has regional behavior, but this is not a legal compliance claim.
- Native StoreKit purchase/restore, Apple payment-sheet branding, TestFlight installation, and cold-start measurements require the owner’s physical iPhone and App Store sandbox.
- The latest local commits must be pushed before a new EAS build can truthfully be described as containing this continuation.

## Current environment blocker

The full integration command attempted to run its Prisma migration against `127.0.0.1:5432`, but no reachable test PostgreSQL listener was available. The unit suite and both TypeScript checks remain green; integration execution is explicitly unverified until a test database is started or a safe test `DATABASE_URL` is supplied.

## Evidence boundary

No credentials, provider secrets, customer data, or legal assertions are included in this document. Scores should remain strict until the outstanding repository and external verification items are closed.
