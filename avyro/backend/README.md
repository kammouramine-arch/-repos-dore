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

Deployment has not been performed. Public registration requires email verification,
password reset, account deletion, retention/purge jobs, backup controls and abuse
limits shared across replicas. Current process-local limits and a single SQLite
writer are intended for a controlled test deployment. Do not deploy this to an
unrelated existing application database.

No road-limit/sign data source, official hazard feed, hosted natural voice or
production map provider has been activated. Obtain appropriate licences and
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
