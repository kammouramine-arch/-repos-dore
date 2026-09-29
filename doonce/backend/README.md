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
  supabase/config.toml                  CLI config: verify_jwt = false and the import map for doonce-analyze
  gateway/src/server-node.ts            the same handler as a local Node server
  gateway/test/                         node:test suite with a stubbed model client and RSA-signed tokens
  gateway/scripts/smoke.ts              live call against the model (needs credentials)
```

## Status

| Piece | Status |
|---|---|
| Contract, request/response models, safety validator, prompt | DONE, tested (`npm test`: 26 tests) |
| Handler: auth, rate limit, size cap, error mapping, structured output parsing | DONE, tested with a stubbed client |
| Apple identity-token verification (RS256 against Apple JWKS, audience, issuer, expiry, key cache) | DONE, tested with locally generated keys |
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
curl -s -X POST localhost:8787/v1/analyze -H 'authorization: Bearer me' -H 'content-type: application/json' -d @gateway/test/request.json
ANTHROPIC_API_KEY=… npm run smoke              # one real analysis of the sample boiler demonstration
```

In the app, set `DoOnceGatewayURL` (Info.plist / `project.yml`) or `DOONCE_GATEWAY_URL` to the
server, and `DoOnceServiceMode` to `live`.

### Routes

`GET {base}/health` (open), `POST {base}/v1/analyze`, `DELETE {base}/v1/account`. Locally `{base}` is
`http://localhost:8787`; deployed it is `https://<ref>.supabase.co/functions/v1/doonce-analyze`.
Inside Supabase the function sees its own name in the path (`/doonce-analyze/v1/analyze`);
`routeOf` in `http.ts` strips `/functions/v1` and `/doonce-analyze`, then matches routes exactly,
so the bare, function-prefixed and fully-prefixed forms all work.

## Deploy (Supabase Edge Functions)

Secrets on the function (never in the repository, never in the app):

```
supabase secrets set ANTHROPIC_API_KEY=… DOONCE_APPLE_AUDIENCE=app.doonce.ios --project-ref <doonce ref>
supabase functions deploy doonce-analyze --project-ref <doonce ref> --no-verify-jwt   # from doonce/backend
curl -fsS https://<doonce ref>.supabase.co/functions/v1/doonce-analyze/health
```

or run the GitHub workflow **DoOnce — deploy gateway** (manual dispatch) with repository secrets
`SUPABASE_ACCESS_TOKEN` and `DOONCE_SUPABASE_PROJECT_REF`. The workflow never uses
`SUPABASE_PROJECT_REF`, which in this repository belongs to another product's production project;
it fails if the DoOnce secret is missing or equal to it, deploys, smoke-checks `/health`, and
prints the gateway URL in the run summary. `DOONCE_AUTH_MODE=dev` must never be set on a deployed
function.

**JWT verification.** Supabase verifies a Supabase JWT on every function call by default, which
would reject the Apple identity token the app sends. `supabase/config.toml` sets
`verify_jwt = false` for `doonce-analyze` (and the deploy passes `--no-verify-jwt`); the function
does its own Apple token verification (`_shared/auth.ts`), so no route but `/health` is open.

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
