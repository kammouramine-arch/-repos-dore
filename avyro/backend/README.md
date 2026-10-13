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
