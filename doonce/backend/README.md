# DoOnce backend — the AI gateway

The iPhone app never holds a model API key. It sends a recorded demonstration's transcript,
timings, markers, moments and a handful of key frames to this gateway with a gateway session token
it obtained by trading the user's Sign in with Apple identity token at `POST /v1/session`; the gateway calls the model with a frozen safety prompt and a strict
output schema, validates the result again, and returns a procedure the app validates a third time
before it becomes a memory.

```
backend/
  contract/openapi.yaml                 the contract the app's DoOnceCore client implements
  supabase/functions/_shared/           runtime-neutral code: contract (zod), prompt, analyze, validate, auth, http
  supabase/functions/doonce-analyze/    Supabase Edge Function (Deno) — POST /v1/session, POST /v1/analyze, DELETE /v1/account
  supabase/functions/deno.json          import map for the Edge runtime
  supabase/config.toml                  CLI config: verify_jwt = false and the import map for doonce-analyze
  gateway/src/server-node.ts            the same handler as a local Node server
  gateway/test/                         node:test suite with a stubbed model client and RSA-signed tokens
  gateway/scripts/smoke.ts              live call against the model (needs credentials)
```

## Status

| Piece | Status |
|---|---|
| Contract, request/response models, safety validator, prompt | DONE, tested (`npm test`: 38 tests) |
| Handler: auth, rate limit, size cap, error mapping, structured output parsing | DONE, tested with a stubbed client |
| Apple identity-token verification (RS256 against Apple JWKS, audience, issuer, expiry, key cache) | DONE, tested with locally generated keys |
| Gateway session tokens (`POST /v1/session`, HS256, 30 days) | DONE, tested (`gateway/test/session.test.ts`) |
| Live model call | BLOCKED BY CREDENTIALS in this environment — `npm run smoke` runs it once a key exists |
| Deployment | BLOCKED BY CREDENTIALS — the workflow `.github/workflows/doonce-deploy-supabase.yml` needs `SUPABASE_ACCESS_TOKEN` and `DOONCE_SUPABASE_PROJECT_REF` |
| Account deletion | PARTIAL — the endpoint accepts and records the request; there is no server data store yet |
| Media upload, household sync, Ask, entitlements | Phase 3 (paths reserved in the contract) |

## Run locally

```
cd doonce/backend
npm install
npm test                                       # no credentials needed
ANTHROPIC_API_KEY=… DOONCE_AUTH_MODE=dev npm run dev   # http://localhost:8787
# optional: DOONCE_SESSION_SECRET="$(openssl rand -base64 48)" enables POST /v1/session locally
curl -s -X POST localhost:8787/v1/analyze -H 'authorization: Bearer me' -H 'content-type: application/json' -d @gateway/test/request.json
ANTHROPIC_API_KEY=… npm run smoke              # one real analysis of the sample boiler demonstration
```

In the app, set `DoOnceGatewayURL` (Info.plist / `project.yml`) or `DOONCE_GATEWAY_URL` to the
server, and `DoOnceServiceMode` to `live`.

### Routes

`GET {base}/health` (open), `POST {base}/v1/session`, `POST {base}/v1/analyze`, `DELETE {base}/v1/account`. Locally `{base}` is
`http://localhost:8787`; deployed it is `https://<ref>.supabase.co/functions/v1/doonce-analyze`.
Inside Supabase the function sees its own name in the path (`/doonce-analyze/v1/analyze`);
`routeOf` in `http.ts` strips `/functions/v1` and `/doonce-analyze`, then matches routes exactly,
so the bare, function-prefixed and fully-prefixed forms all work.

### Authentication and sessions

A Sign in with Apple identity token is valid for about ten minutes, so the app trades it once:

```
POST {base}/v1/session
Authorization: Bearer <Apple identity token>

200 {"accessToken":"<jwt>","expiresAt":"2026-10-29T12:00:00Z","tokenType":"Bearer"}
```

and sends `Authorization: Bearer <accessToken>` to `/v1/analyze` and `/v1/account` until
`expiresAt` (30 days), then trades a fresh Apple token again. The body of the request is ignored.

- The session token is an HS256 JWT, header `{"alg":"HS256","typ":"JWT"}`, claims
  `iss: "doonce-gateway"`, `aud: "doonce-app"`, `sub` (the Apple subject), `prv: "apple"`, `iat`,
  `exp = iat + 30 days`, signed with `DOONCE_SESSION_SECRET` (its UTF-8 bytes, at least 32).
- `/v1/session` accepts **only** an Apple identity token: a session token cannot mint another
  session (401). `/v1/analyze` and `/v1/account` accept either: a token whose header says HS256 is
  checked as a session token (constant-time signature, issuer, audience, expiry, subject), anything
  else as an Apple token.
- Errors use the same body as every route, `{"error":{"code","message"}}`: 401 `unauthorized`
  (missing, malformed, expired or forged bearer, or a session token), 403 `unauthorized` (Apple token
  for another audience), 503 `session_unavailable` (no usable `DOONCE_SESSION_SECRET`).
- Without a usable secret the function still starts, logs `auth.sessions_disabled` once (never the
  secret), keeps accepting Apple tokens on `/v1/analyze`, refuses HS256 tokens, and answers
  `/v1/session` with 503; the app then keeps sending the Apple token.
- Rotating `DOONCE_SESSION_SECRET` signs every user out (their next call gets 401 and they sign in again).
- `DOONCE_AUTH_MODE=dev`: analyze/account accept any bearer as before; with a secret set,
  `/v1/session` issues a session for the dev subject with `prv: "dev"`, which a verifying gateway never accepts.

## Deploy (Supabase Edge Functions)

Secrets on the function (never in the repository, never in the app):

```
supabase secrets set ANTHROPIC_API_KEY=… DOONCE_APPLE_AUDIENCE=app.doonce.ios --project-ref <doonce ref>
supabase secrets list --project-ref <doonce ref>   # DOONCE_SESSION_SECRET present? if not, once:
supabase secrets set DOONCE_SESSION_SECRET="$(openssl rand -base64 48)" --project-ref <doonce ref>
supabase functions deploy doonce-analyze --project-ref <doonce ref> --no-verify-jwt   # from doonce/backend
curl -fsS https://<doonce ref>.supabase.co/functions/v1/doonce-analyze/health
```

or run the GitHub workflow **DoOnce — deploy gateway** (manual dispatch) with repository secrets
`SUPABASE_ACCESS_TOKEN` and `DOONCE_SUPABASE_PROJECT_REF`. The workflow never uses
`SUPABASE_PROJECT_REF`, which in this repository belongs to another product's production project;
it fails if the DoOnce secret is missing or equal to it, creates `DOONCE_SESSION_SECRET` on the
project only if `supabase secrets list` does not show it (generated with `openssl rand -base64 48`,
masked, never printed, never regenerated), deploys, smoke-checks `/health` (200) and
`POST /v1/session` without a bearer (401), and prints the gateway URL in the run summary. `DOONCE_AUTH_MODE=dev` must never be set on a deployed
function.

**JWT verification.** Supabase verifies a Supabase JWT on every function call by default, which
would reject the Apple identity token the app sends. `supabase/config.toml` sets
`verify_jwt = false` for `doonce-analyze` (and the deploy passes `--no-verify-jwt`); the function
does its own verification of Apple and session tokens (`_shared/auth.ts`), so no route but `/health` is open.

## Safety model

`prompt.ts` states the rules the model follows. The model sees the transcript and up to 12 key
frames (evenly spread when more arrive; only frames with pixels), each as a text label
`Frame f3 at 0:24` followed by a base64 JPEG image block, so it can identify the object, order
physical actions and cite `keyFrameReference: "f3"`.

`validate.ts` enforces the rules that can be checked mechanically. **Verbatim provenance** comes
first: `sourceTranscript` is shown in the app as the demonstrator's own words, so after
normalisation (NFC, lower case, apostrophes and curly quotes unified away, other punctuation
collapsed to spaces) it must be a contiguous run of whole words of the transcript. A paraphrase is
replaced by the transcript segments overlapping the step's range, verbatim, or by null when there is
no usable range (adjustment `sourceTranscriptNotVerbatim`). Then: source ranges clamped to the recording, steps without speech or range become
inferred with confidence ≤ 0.5, numbers the demonstrator never said downgrade a step and add an
uncertainty, low confidence becomes "This part wasn't clearly captured.", step count is capped by
what the recording can support, risk never drops below what the words imply, warnings deduplicated.
The app runs the same rules in `DoOnceCore.AnalysisValidator` (the verbatim rule as
`.sourceTranscriptNotVerbatim`, with the identical normalisation).

## Model

`claude-opus-5` by default (`DOONCE_MODEL` overrides), adaptive thinking, effort `high`, structured
output via the JSON schema derived from the zod contract, cached system prompt, streaming, and
server-side refusal fallbacks (`fallbacks: "default"`).
