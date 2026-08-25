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

Model choice is not an environment variable. Providers and models live in the
`ai_registry` row of `app_config`, and routing policy in `ai_policy` — both private,
both changeable without a release.

| Variable | Required | What it is |
|---|---|---|
| `GOOGLE_GEMINI_API_KEY` | primary | Google AI Studio key. **Paid billing must be enabled** — on the free tier Google may use the content to improve its products. |
| `GROQ_API_KEY` | fast tier | Groq Developer tier. Fast, cheap, and holds the cheapest transcription. |
| `MISTRAL_API_KEY` | EU / sensitive | The only provider cleared for finance and personal reflection. |
| `OPENAI_API_KEY` | no | **Not required.** Implemented but disabled; it bills from prepaid credit. |
| `ANTHROPIC_API_KEY` | migration only | Used only while `ai_policy.routerEnabled` is false. Removed in Phase 14. |
| `AI_NAME` | no | What the assistant calls itself. Defaults to the brand name. |

Without any provider key the assistant returns a clear 503 and the rest of the app
still works. A model whose price is not confirmed from the provider's own
documentation is refused for production routing.

### Store billing

| Variable | Required for | What it is |
|---|---|---|
| `APPLE_ISSUER_ID` | iOS purchases | App Store Connect → Users and Access → Integrations → In-App Purchase |
| `APPLE_KEY_ID` | iOS purchases | The key's ID |
| `APPLE_PRIVATE_KEY` | iOS purchases | The `.p8` contents, newlines intact |
| `APPLE_BUNDLE_ID` | iOS purchases | `app.lifeos` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Android purchases | Service-account JSON on one line |
| `ANDROID_PACKAGE_NAME` | Android purchases | `app.lifeos` |
| `STORE_WEBHOOK_SECRET` | renewals | Random secret in the notification URL. `openssl rand -hex 32` |

Missing store credentials produce a `501 store_not_configured` with the exact missing
variable named — never a granted entitlement.

### Voice

Transcription is routed like every other model call — there is no transcription
provider variable any more. `TRANSCRIBE_PROVIDER` and the OpenAI key used to gate it,
which quietly made OpenAI mandatory for voice. The router now picks an audio-capable
model that is enabled, priced and cleared for the recording's privacy class, or the
microphone stays disabled and says so.

Two audio routes ship: Groq Whisper ($0.04/hour, normal-privacy data only) and Mistral
Voxtral ($0.003/minute, EU, cleared for sensitive recordings).

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
