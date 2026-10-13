# Avyro gateway

Node 24, no third-party server packages. Run `npm test` or `npm start` in this
directory. The server binds to loopback port 8787 and uses SQLite. Place it behind
a TLS reverse proxy before connecting the mobile app. Do not expose plain HTTP.

Set `EXPO_PUBLIC_BACKEND_URL=https://your-approved-host` at app build time to use
server identity, the `/ai` classifier and `/incidents`. Leaving it empty preserves
the device-local test mode. Local accounts are not gateway credentials; sign in
or register on the gateway once it is configured.

Server-only configuration:

- `OPENAI_API_KEY`: a restricted provider key; never a public app environment variable.
- `AVYRO_AI_MODEL`: an approved model for JSON command classification. No default
  paid model is enabled, and an unset key/model returns 503 with local app fallback.
- `AVYRO_MODERATOR_IDS`: comma-separated server user IDs authorized to moderate.
- `PORT`: optional, defaults to 8787.

Authenticated endpoints use a server-issued opaque Bearer session. The database
stores only session-token hashes and scrypt password digests. Sessions expire in
seven days and logout revokes the presented token.

`POST /incidents`: category (`accident`, `hazard`, `closure`, `police`), latitude,
longitude, `observedAt` epoch milliseconds and `consent: true`. Returns 202 pending.
The app asks for consent, requires a fresh stationary fix and warns that the report
is under review. Coordinates are rounded to about a street block before storage.

`GET /incidents?latitude=…&longitude=…`: approved, unexpired community observations
near the requested area. They remain `verified: false`; moderation does not make
an observation an official hazard fact. No reporter identities are returned.

Moderators use `GET /moderation` for the queue, and `POST /moderation` with an
incident `id` and `decision: approved|rejected`. Decisions are transactional and
audited. Expired/already-reviewed reports cannot be approved again.

An explicitly authorized temporary HTTPS beta connection is now running on the
owner's Windows computer. This is controlled testing, not production hosting.
It ends when the computer/tunnel stops; the hostname changes on tunnel restart.
Public registration requires email verification,
password reset, account deletion, retention/purge jobs, backup controls and abuse
limits shared across replicas. Current process-local limits and a single SQLite
writer are intended for a controlled test deployment. Do not deploy this to an
unrelated existing application database.

The connected beta can read licensed evaluation road-limit data. No official
hazard feed, hosted natural voice or production map provider is active.
Obtain appropriate licences and
approve the deployment/provider costs before enabling those services.

## Road-data evaluation adapter

`POST /roads/context` is authenticated and disabled by default. Server-only
`TOMTOM_API_KEY` and `AVYRO_ROAD_DATA_ENABLED=true` activate the adapter only
after verifying the account's evaluation entitlement, remaining free allowance,
permitted Avyro use case, attribution and map-display conditions. A key alone
does not enable calls. Do not enable Pay As You Grow without user approval.

Body: `{fixes:[{latitude,longitude,timestamp,accuracy},...],consent:true}`.
Two to twelve ordered fixes must be accurate within 25 m, at most one minute old,
with a latest fix no older than five seconds, at least 5 m of net movement and
no jump over 2 km. This endpoint never stores GPS traces. It reserves one request
in SQLite before each upstream call and stops at 1,000 requests per UTC month,
including failed calls. This protects this gateway only: other users of the same
key, changed provider allowances and dashboard billing still require checking.
Never delete or reset the usage table to obtain more free calls.

The response includes source, match status, speedLimit or null, recentSegmentSigns,
capturedAt, receivedAt and expiresAt. Confidence below 0.9, off-road results, a
projection more than 25 m away, expired responses, advisory speeds and unknown
units return no maximum limit. These thresholds are conservative engineering
choices, not a measured road-match accuracy guarantee. The caller must also
clear evidence on movement, expiry, poor GPS, sign-out and backgrounding.
Signs describe the traveled segment, not hazards/signs ahead. Data is TomTom map
evidence, not a government-confirmed observation. No lane-change assurances.

Mobile source now includes an opt-in Settings control and speed-limit display,
enabled only when `EXPO_PUBLIC_ROAD_DATA_ENABLED=true` and a HTTPS backend URL are
configured at build time. Evidence clears on expiry, more than 15 m of movement,
poor GPS, sign-out, end of guidance and backgrounding. Requests are spaced at
least 12 seconds apart. No sign warnings or incident-feed claims are made.
Build 26 includes the wiring, with activation off. Live evaluation requests have
confirmed the API and mapped limits on selected public routes in five countries;
this is not physical driving validation or proof of worldwide coverage. Tests use
documented-schema fixtures and adversarial cases. See `docs/PROVIDER-SELECTION.md`
for the evidence and outstanding commercial restrictions.

## Free local AI classifier

Set `AVYRO_USE_LOCAL_CLASSIFIER=true` only with a working loopback model server
on `127.0.0.1:8181`, model alias `avyro-local`. It takes precedence over the paid
provider and never falls back to a billed API. The current beta uses official
Qwen2.5-1.5B-Instruct Q4_K_M through llama.cpp CPU runtime b11602, four threads,
one slot, 2048-token context, web UI and logging disabled. The model server is
not exposed by the tunnel. No user transcript is logged or sent to a paid AI
provider. Windows must remain awake and connected for the beta backend to work.

Model: Apache 2.0, official model card
https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
revision `91cad51170dc346986eccefdc2dd33a9da36ead9`, SHA256
`6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`.
Runtime: MIT, https://github.com/ggml-org/llama.cpp/blob/b11602/LICENSE.
Windows CPU archive SHA256
`4f3da792ec5eee550eca467807bfc5f8bc3e30836870587fdd73dc4a4ea24a5f`.
Both downloads were hash-verified; original licence files are preserved with
the local runtime. Weights/runtime are not committed or shipped in the IPA.

Six local command checks passed (four real model classifications, two deterministic
negation/safety refusals), observed 0.93–2.11 seconds for model calls. This is not
a broad accuracy or latency claim. The smaller 0.5B model misclassified an ETA
question and was not enabled for the beta. Additional guards reject invented
destinations, unmentioned saved places and unrelated cancellation/route actions.
Output prose and unrelated fields are discarded. Invalid/slow model responses
leave the phone's local command resolver in control.
