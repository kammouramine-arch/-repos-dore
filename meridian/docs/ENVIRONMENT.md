# Environment variables

Two kinds, and the difference matters: **client** values are compiled into the app and
anyone can read them; **server** values exist only as Supabase secrets and never reach
a device. A test fails the build if a server secret name appears in client code.

---

## Client — bundled into the app

Read by `app.config.ts` → `extra` → `src/config/env.ts`. Put them in `.env`.

| Variable | Required | What it is |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | Publishable key. Safe on device: every table is behind RLS and grants nothing on its own. |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | no | `false` disables product analytics at build time. |
| `EAS_PROJECT_ID` | for push | Without it, push registration is skipped rather than faked. |

---

## Server — Supabase secrets

Set with `supabase secrets set KEY=value`. Never in `.env` files that ship, never in
the repo.

### The assistant

| Variable | Required | Default | What it is |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | Without it, the assistant returns a clear 503 and the rest of the app still works. |
| `AI_NAME` | no | `Meridian` | What the assistant calls itself. |
| `AI_REFUSAL_FALLBACK` | no | `true` | `false` disables the server-side refusal fallback beta. |

### Model routing (per tier)

Optional overrides of `supabase/functions/_shared/plans.ts`, useful for trying a model
on staging first. Anything unset falls back to the catalogue.

`AI_MODEL_FREE`, `AI_MODEL_PLUS`, `AI_MODEL_PRO`, `AI_MODEL_ULTRA`,
`AI_MODEL_PRO_ADVANCED`, and the matching `AI_EFFORT_*`
(`low` · `medium` · `high` · `xhigh` · `max`).

### Store billing

| Variable | Required for | What it is |
|---|---|---|
| `APPLE_ISSUER_ID` | iOS purchases | App Store Connect → Users and Access → Integrations → In-App Purchase |
| `APPLE_KEY_ID` | iOS purchases | The key's ID |
| `APPLE_PRIVATE_KEY` | iOS purchases | The `.p8` contents, newlines intact |
| `APPLE_BUNDLE_ID` | iOS purchases | `app.meridian.planner` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Android purchases | Service-account JSON on one line |
| `ANDROID_PACKAGE_NAME` | Android purchases | `app.meridian.planner` |
| `STORE_WEBHOOK_SECRET` | renewals | Random secret in the notification URL. `openssl rand -hex 32` |

Missing store credentials produce a `501 store_not_configured` with the exact missing
variable named — never a granted entitlement.

### Voice

| Variable | Required for | What it is |
|---|---|---|
| `TRANSCRIBE_PROVIDER` | voice input | `openai`, or unset to disable |
| `OPENAI_API_KEY` | voice input | Whisper key |
| `TRANSCRIBE_MODEL` | no | Defaults to `whisper-1` |

Without these the microphone button explains that voice is not configured. It never
fabricates a transcript.

### Injected automatically

Inside deployed edge functions Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`
and `SUPABASE_SERVICE_ROLE_KEY`. Only set them by hand for `supabase functions serve`.

---

## Runtime configuration, not env vars

Pricing, quotas, entitlements, trial lengths and model routing can all be changed
**without a release** through the `app_config.plans` row — see
[BILLING.md](BILLING.md). Use secrets for per-environment differences; use
`app_config` for product decisions.

---

## Verifying

```bash
supabase secrets list                 # server side
npx expo config --type public         # what the app will actually see
npm test -- security                  # fails if a secret name is in client code
```
