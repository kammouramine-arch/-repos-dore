# 01 · Product and readiness register

DEVISIA helps French artisans prepare quotes from a description, voice input and chantier photos, review prices/TVA, generate PDFs, manage clients/prospects and prepare follow-ups. Web and React Native mobile share a Next.js backend. AI prepares a draft; the artisan approves the commercial document. Online client acceptance is not required for the principal product journey.

## Evidence-backed coverage

| Area | Evidence | Status / remaining acceptance test |
|---|---|---|
| Authentication / tenant roles | `src/lib/auth`, authService, permissions and integration tests | NEEDS IMPROVEMENT: live recovery, concurrent-session and cross-tenant tests must pass against isolated PostgreSQL |
| Name/email account editing | accountService, `/api/auth/compte`, `/api/auth/code-email`, mobile compte | Implemented; email delivery BLOCKED BY EXTERNAL ACTION. Verification not enforced; Apple sign-in missing |
| Onboarding / pricing | mobile presentation, apple-paywall, shared plans | Three-day Apple offers previously configured. Device eligibility/renewal/restore still require test evidence |
| Dashboard / navigation | mobile index, scrub-tab-bar, snapshot tests | Implemented improvements; no claim of measured iPhone frame rate. Build 13 device QA pending |
| AI text / photo / voice | aiQuoteService, `src/lib/ai`, mobile capture | User reported photo/password working. Re-run paid-provider and permission-denial tests; model availability is external |
| Clients / leads | customerService, leadService, API and mobile tabs | CRUD implemented; test create/edit/convert, empty states and tenant boundaries |
| Quote editor / PDF | quoteService, quotePdfService, PDF unit/integration fixtures | PDF layout corrected previously. Human review of legal fields/rounding and multi-page output required |
| Email / follow-ups | quoteSendService, followUpService, cron route | BLOCKED BY EXTERNAL ACTION: verified sender and delivery credentials missing. Must not demo a queued/accepted message as inbox delivery |
| Assistant / analytics / admin | assistantService, analyticsService, admin routes | Source exists; not all capabilities exposed equally on mobile. No verified traction inferred from demo analytics |
| Network / persistence | shared API client, SecureStore snapshots, query cache | Timeout handling and cached display present; test cold/offline launch, 401 and account switching |
| Public site | marketing pages, nav, pricing, legal pages | Copy corrected locally; visual QA and deployed-copy verification remain gates |
| Privacy / deletion | legal pages; no complete self-service account deletion endpoint found | NEEDS IMPROVEMENT plus LEGAL REVIEW; mailto support is not a substitute for in-app deletion |
| Mobile release | EAS configuration, prior TestFlight builds | Internal beta, not a publicly released acquisition-ready App Store listing |

## Priority register

P0 before public sale/launch: verified email delivery and recovery; user-data deletion/export design; remove sandbox receipt access before public launch; finalize legal entity/privacy disclosure; verify App Store transfer eligibility; supply ownership/contractor assignments.

P1 before buyer demonstration: clean isolated demo database; end-to-end scripted rehearsal; first-load latency investigation; device navigation/keyboard/restore QA; backups restored in isolation; security audit including Git history and dependency advisories.

P2 before handover: provider invoices/cost alerts, monitoring ownership, reproducible CI, signed asset schedule and transition support terms.

Acceptance means a recorded result with build/commit/date, not a checkbox based only on source existence. Maintain the evidence ledger as work proceeds. No customers, revenue, uptime or conversion rate has been independently verified in this audit.
