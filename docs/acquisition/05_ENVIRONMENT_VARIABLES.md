# 05 · Configuration register — names only

Never attach environment exports to the data room. `evidence/environment-names.json` gives statically discovered names and source references; inspect central `src/lib/env.ts`, direct process.env reads and mobile app.config.ts when adding configuration. Dynamic lookups/external dashboard-only settings may not be captured.

| Names / family | Purpose and custody |
|---|---|
| NODE_ENV, APP_URL | Runtime mode, canonical public web origin |
| DATABASE_URL, DIRECT_URL | Runtime and migration database connections; secret |
| AUTH_SECRET | Security hashing/signing material; secret; rotate only with a session/token impact plan |
| AI_PROVIDER | Select Gemini, Anthropic or local heuristic path |
| GEMINI_API_KEY, GEMINI_MODEL, GEMINI_QUOTE_MODEL, GEMINI_VISION_MODEL | Secret provider key and nonsecret model selectors |
| ANTHROPIC_API_KEY, ANTHROPIC_MODEL | Optional alternate AI provider |
| TRANSCRIPTION_PROVIDER, TRANSCRIPTION_API_KEY, TRANSCRIPTION_BASE_URL, TRANSCRIPTION_MODEL | Optional server audio transcription; endpoint must be trusted |
| EMAIL_PROVIDER, RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO | Delivery provider, secret, verified sender identity and default platform reply address |
| STORAGE_PROVIDER, STORAGE_LOCAL_DIR | Database/S3/local selection; local is not durable serverless storage |
| S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY | Private object-storage configuration and credentials |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Server-only payment secrets |
| STRIPE_PRICE_ESSENTIEL, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTREPRISE | Account-specific prices; remap during migration |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Intentionally public Stripe client identifier |
| APPLE_* | Direct-read Apple verification settings; use evidence/source for exact supported names, never copy private signing keys into public config |
| EXPO_ACCESS_TOKEN, PUSH_ENABLED | Push authorization and enable switch |
| EXPO_PUBLIC_API_URL | Public mobile backend origin; embedded in build, never a secret |
| CRON_SECRET | Authenticates scheduled follow-up execution |
| MESSAGING_PROVIDER, TWILIO_*, WHATSAPP_* | Optional messaging configuration; adapters do not prove production setup |
| DEVISIA_ALLOW_DEMO_SEED | Explicit local seed reset consent; never enable on production |

Rotate keys through provider dashboards into the destination secret manager. Validate new keys before revoking old keys. Avoid printing values in CLI status output, crash logs, examples, screenshots or CI. Public-prefix variables are bundled into clients. No production values were read to generate this register.
