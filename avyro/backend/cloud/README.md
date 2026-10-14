# Independent beta hosting

Cloudflare Workers + D1 replace the computer and temporary tunnel. The public
Worker holds only bindings; the TomTom key is uploaded as a server secret and
never included in the phone app. No previous computer database is imported.

Navigation, saved Home/Work, foreground wake and deterministic French/English
commands work without a personal account. Gateway access uses a random guest
token, hashed at rest server-side and kept in the phone keystore. Optional
accounts use salted PBKDF2-SHA256 with 600,000 iterations in a private,
SQLite-backed Durable Object, avoiding the ordinary Free Worker CPU ceiling.
Both Workers and SQLite-backed Durable Objects support the Free plan:
https://developers.cloudflare.com/durable-objects/platform/limits/

Cloudflare production WebCrypto refuses PBKDF2 above 100,000 iterations even
though local workerd permits it. The private object uses pinned MIT
`@noble/hashes` 2.4.0 to retain 600,000 iterations. Its result is checked against
independent Node native PBKDF2, including Unicode input. Reference:
https://github.com/cloudflare/workerd/pull/7550

Limits are shared atomically through D1: 500 new guests/day, 100 registrations/day,
1,000 authentication attempts/day, 100 optional AI calls/day, and 1,000 road-data
requests/UTC month. Free account quotas can stop requests; they do not authorize
an upgrade. The application never activates a paid plan or billed fallback.

Reports are always pending, expire after an hour and require a configured
account moderator to approve. There is no assigned moderation operation yet.
Tokens, old guest identities, rate buckets and report/audit records are cleaned
by the deployed service; reports and audits have a seven-day retention window.
Personal accounts still need email verification, reset and deletion UX before
public production release.

Optional cloud classification uses Apache-2.0 Qwen3-30B-A3B on Cloudflare:
https://huggingface.co/Qwen/Qwen3-30B-A3B/blob/main/LICENSE
https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/
Its server-side model and prompt are fixed; provider prose, route-control
commands, invented destinations and unsafe/negated commands are rejected.
The phone asks separately for command-sharing consent. Ambient recognition is
strictly on-device. Cloudflare's data-use policy:
https://developers.cloudflare.com/workers-ai/platform/data-usage/

Local validation: `npm ci`, `npx wrangler d1 execute avyro-beta --local --file schema.sql`,
`npm run dev`, then `npm test`. The HTTP tests exercise workerd and local D1,
not a mock SQL adapter. Keep `AI_ENABLED=false` during local tests so no live
inference is consumed.

Deployment requires an authenticated Cloudflare Free account. Create the D1
database, replace `database_id` with its returned UUID, apply `schema.sql` remotely,
upload `TOMTOM_API_KEY` through secret stdin, and verify the Free plan before
enabling the licensed evaluation road feed or AI binding. Run live synthetic
verification before compiling the stable workers.dev URL into the phone app.

October 14: deployed at https://avyro-gateway.avyro-cloud-gateway.workers.dev on
the verified $0 Free plan. Eight tests passed against HTTPS hosted identity/D1
(road/AI flags disabled during that suite). After enabling the evaluation road
feed and free AI binding, a public documentation-coordinate sample returned a
matched 70 km/h limit and one traveled-segment sign. English Home and French ETA
model samples passed; lane-change and negated-action samples returned unknown.
No real location trace, email, transcript or account database was imported.
The road counter starts at 100 for October to reserve prior evaluation usage.
