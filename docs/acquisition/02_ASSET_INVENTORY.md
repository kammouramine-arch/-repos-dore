# 02 · Proposed acquisition asset schedule

Not a legal conveyance. Owner and buyer must agree inclusions and prove title.

| Candidate asset | Repository / custody evidence | Transfer qualification |
|---|---|---|
| DEVISIA name and visual identity | brand components, mobile theme, SVG/PNG icons | Trademark clearance/registration and ownership UNKNOWN |
| Web frontend / backend | `src/`, configuration, migrations | Source deliverable; assignments and third-party licenses require review |
| iOS / Android source | `mobile/` with Expo config and patches | iOS beta exists; Android store release not verified |
| Shared financial / subscription logic | `packages/shared/` | Included source, subject to IP chain verification |
| Database schema and migration history | `prisma/` | Included; live customer records are a separate legally reviewed asset |
| AI prompts, matching, validation | `src/lib/ai`, aiQuoteService | Included implementation; provider models/API accounts are not owned IP |
| Follow-up / cron / admin / email templates | services, API, `src/lib/email/templates.ts` | Included implementation; configured delivery not yet complete |
| Logos and app artwork | `mobile/assets/`, brand components, generated web icon routes | Source artwork present; authorship/provenance requires seller attestation |
| Website and domains | hosted Vercel application; domain registration records not supplied | No claim of ownership of devisia.fr or amyn.agency; verify separately |
| App Store record and subscriptions | existing DEVISIA App Store Connect record | Conditional on Apple eligibility, not equivalent to transfer of personal developer account |
| Documentation / demo fixtures | README, docs, prisma seed | Included; demo records are synthetic, not traction |
| Design files / social accounts | None established in repository | UNKNOWN; do not list as included without records |
| Analytics and operating records | service code exists; live exports not reviewed | Separate redacted evidence, access and privacy review |

Excluded by default: personal email/Apple/GitHub accounts; personal agency domain; developer tool subscriptions; unlicensed or unrelated archived REVA website; raw recordings/contact sheets; production secrets; customer data until lawful scope is agreed. `archive/reva-site` requires explicit provenance and scope review before any buyer repository transfer.

Before closing, append for every included external asset: owner legal name, account/project identifier in a restricted annex, evidence of title, transfer method, buyer destination, acceptance test, exclusions and warranty limitations. Never place credentials in this schedule.
