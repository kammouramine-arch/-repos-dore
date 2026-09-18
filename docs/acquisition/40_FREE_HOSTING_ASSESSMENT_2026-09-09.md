# Free commercial hosting assessment — 9 September 2026

## Decision and scope

Owner authorizes no paid services and no hosting migration. Vercel remains unchanged. Its [Hobby terms](https://vercel.com/legal/terms) restrict use to personal/non-commercial use, so commercial launch on the current plan is blocked. Do not bypass this by changing labels, splitting traffic/accounts, or describing a commercial product as a hobby.

## Candidate: Netlify Free

Netlify explicitly states that its free tier [permits commercial projects](https://www.netlify.com/guides/netlify-vs-vercel/). Its current [Free plan](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) is $0/month with 300 credits and a hard limit, without auto-recharge. Exhaustion pauses service until credits reset. This is genuinely free hosting, not a time-limited paid trial; it is not an availability guarantee.

Its official [Next.js adapter documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) supports App Router, SSR, route handlers and Server Actions. DEVISERA uses Next.js 16, Node, Prisma/PostgreSQL, sharp, pdf-lib and external email/AI/Apple services. **Architecturally plausible, not yet deployment-verified.** Do not claim drop-in compatibility or production readiness based on framework marketing.

| Current requirement | Migration validation needed after approval |
|---|---|
| Next.js route handlers and cookies | Build pinned lockfile with Netlify adapter; test auth, no-store headers, redirects and secure cookies on isolated preview |
| Prisma 6/PostgreSQL | Package Linux engine correctly; use a non-production DB first; verify pooled runtime/direct migration connections and TLS |
| sharp 0.35.4 / PDF | Verify native binary packaging, decoded image limits, PDF generation and response sizes |
| Uploads | Database-backed storage does not require Vercel Blob; verify multipart/body size limits and authenticated file serving; never use ephemeral local disk as persistent storage |
| AI request (60-second route budget) | Check actual function duration/streaming allowance and credit use under realistic requests; Vercel maxDuration is not portable configuration |
| Daily follow-up cron | `vercel.json` cron will not migrate automatically; use a supported scheduled function with the same secret-protected handler and idempotency; prevent two schedulers sending duplicate emails |
| Mobile API URL | Existing production binary points to `devisia-bice.vercel.app`; a new approved API origin/build and transition plan are necessary, not just DNS migration |
| Domain/email | Move web DNS only after preview acceptance; preserve OVH MX and Resend records; verify TLS, callbacks, Apple server notifications and CORS |
| Provenance | Map provider commit metadata to the existing validated `RELEASE_GIT_SHA`; preserve health checks and rollback evidence |
| Capacity/operations | Measure credit consumption; document hard-stop risk, free monitoring, backup custody, region/DPA and owner response |

Do not move production DB/data, change DNS, create accounts, configure paid features or switch mobile API origin during this assessment. A separate owner-approved isolated evaluation should prove the above before a cutover decision.

## Why not recommend Cloudflare Workers as an immediate replacement?

Cloudflare supports Next.js through OpenNext, but its [Free limits](https://developers.cloudflare.com/workers/platform/limits/) include a small Worker bundle and CPU budget. The present Prisma/native sharp/Node stack needs a compatibility and resource-budget assessment. No proof establishes that this entire backend fits free Workers. A static frontend alone would not replace DEVISERA's backend.

## Score handling

Keep one explicit commercial-hosting eligibility blocker in the operational score. A free alternative can remove that blocker **after approval and successful validation**, not merely because this document exists. Keep Apple pricing, physical-device verification, legal facts, backups and alert-delivery deductions tied to their own evidence, not to the absence of a paid plan.
