# DoOnce backend — the AI gateway

The iPhone app never holds a model API key. It sends a recorded demonstration's transcript,
timings, markers, moments and a handful of key frames to this gateway with the user's Sign in
with Apple identity token; the gateway calls the model with a frozen safety prompt and a strict
output schema, validates the result again, and returns a procedure the app validates a third time
before it becomes a memory.

```
backend/
  contract/openapi.yaml                 the contract the app's DoOnceCore client implements
  supabase/functions/_shared/           runtime-neutral code: contract (zod), prompt, analyze, validate, auth, http
  supabase/functions/doonce-analyze/    Supabase Edge Function (Deno) — POST /v1/analyze, DELETE /v1/account
  supabase/functions/deno.json          import map for the Edge runtime
  gateway/src/server-node.ts            the same handler as a local Node server
  gateway/test/                         node:test suite with a stubbed model client and RSA-signed tokens
  gateway/scripts/smoke.ts              live call against the model (needs credentials)
```

## Status

| Piece | Status |
|---|---|
| Contract, request/response models, safety validator, prompt | DONE, tested (`npm test`: 11 tests) |
| Handler: auth, rate limit, size cap, error mapping, structured output parsing | DONE, tested with a stubbed client |
| Apple identity-token verification (RS256 against Apple JWKS, audience, issuer, expiry, key cache) | DONE, tested with locally generated keys |
| Live model call | BLOCKED BY CREDENTIALS in this environment — `npm run smoke` runs it once a key exists |
| Deployment | BLOCKED BY CREDENTIALS — the workflow `.github/workflows/doonce-deploy-supabase.yml` needs the Supabase secrets |
| Account deletion | PARTIAL — the endpoint accepts and records the request; there is no server data store yet |
| Media upload, household sync, Ask, entitlements | Phase 3 (paths reserved in the contract) |

## Run locally

```
cd doonce/backend
npm install
npm test                                       # no credentials needed
ANTHROPIC_API_KEY=… DOONCE_AUTH_MODE=dev npm run dev   # http://localhost:8787
curl -s -X POST localhost:8787/v1/analyze -H 'authorization: Bearer me' -H 'content-type: application/json' -d @gateway/test/request.json
ANTHROPIC_API_KEY=… npm run smoke              # one real analysis of the sample boiler demonstration
```

In the app, set `DoOnceGatewayURL` (Info.plist / `project.yml`) or `DOONCE_GATEWAY_URL` to the
server, and `DoOnceServiceMode` to `live`.

## Deploy (Supabase Edge Functions)

Secrets on the function (never in the repository, never in the app):

```
supabase secrets set ANTHROPIC_API_KEY=… DOONCE_APPLE_AUDIENCE=app.doonce.ios --project-ref <ref>
supabase functions deploy doonce-analyze --project-ref <ref>
```

or run the GitHub workflow **DoOnce — deploy gateway** with repository secrets
`SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`. `DOONCE_AUTH_MODE=dev` must never be set on a
deployed function.

## Safety model

`prompt.ts` states the rules the model follows; `validate.ts` enforces the ones that can be
checked mechanically: source ranges clamped to the recording, steps without speech or range become
inferred with confidence ≤ 0.5, numbers the demonstrator never said downgrade a step and add an
uncertainty, low confidence becomes "This part wasn't clearly captured.", step count is capped by
what the recording can support, risk never drops below what the words imply, warnings deduplicated.
The app runs the same rules in `DoOnceCore.AnalysisValidator`.

## Model

`claude-opus-5` by default (`DOONCE_MODEL` overrides), adaptive thinking, effort `high`, structured
output via the JSON schema derived from the zod contract, cached system prompt, streaming, and
server-side refusal fallbacks (`fallbacks: "default"`).
