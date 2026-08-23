# LifeOS

**Your AI Operating System for Life.**

Plan your life. Understand yourself. Move forward.

You talk about your life; LifeOS builds and maintains the plan — goals, habits,
projects, your week, today — and changes it when your life changes.

LifeOS is a real mobile app (Expo / React Native / TypeScript) with a Supabase
backend and a server-side AI integration that can act on your data through a fixed,
validated set of tools. It is not a chat wrapper: every claim the assistant makes about
what it did corresponds to a stored database action, shown in the UI as a receipt.

---

## What is in here

```
app/                     Screens and navigation (expo-router)
src/
  components/            UI kit and domain components
  config/                Brand, environment, features, subscription config
  hooks/                 Data hooks (react-query + offline cache)
  lib/                   Supabase client, secure storage, cache, offline outbox
  services/              One module per domain — the only place that talks to the DB
  state/                 Auth, connectivity and query providers
  theme/                 Design tokens, light/dark, reduced motion
  types/database.ts      Typed mirror of the schema
  utils/                 Dates and local planning heuristics
supabase/
  migrations/            Schema, row level security, triggers and RPCs
  functions/_shared/plans.ts   Tiers, entitlements, quotas, weighted costs, model routing
  functions/_shared/agents.ts  The specialised agent briefs
  functions/ai-chat/     The assistant: context, tools, execution, receipts
  functions/transcribe/  Speech to text (needs a provider key)
  functions/daily-brief/ Morning briefing generation
  functions/subscription-verify/  Apple / Google purchase verification
  functions/store-notifications/  Renewal and cancellation webhooks
__tests__/               Unit, integration and security tests
scripts/seed-demo.mjs    Realistic demo account, one command to add or remove
docs/                    AI, backend, auth and billing notes
```

---

## Running it

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Backend

You need a Supabase project (cloud or local). With the
[Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase start                     # local stack, or use a cloud project
supabase db push                   # apply supabase/migrations
```

No terminal? Paste [`supabase/dist/all-migrations.sql`](supabase/dist/all-migrations.sql)
into the Supabase SQL Editor instead, then
[`supabase/tests/verify.sql`](supabase/tests/verify.sql) to check it.

Put the project URL and anon key in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

The anon key is safe in the app: every table has row level security and all policies
are scoped to `auth.uid()`.

### 3. Builds

Purchases are native (StoreKit 2 / Play Billing), so they need a development or store
build — not Expo Go:

```bash
npm install -g eas-cli && eas login
eas build --profile development --platform ios      # or android
```

Everything else runs in Expo Go. Full store setup is in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### 4. The assistant

The AI runs in a Supabase Edge Function so the API key never reaches the device:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai-chat transcribe daily-brief
```

Without `ANTHROPIC_API_KEY` the app still works as a planner — the assistant returns a
clear "not configured" message rather than pretending. See [docs/AI.md](docs/AI.md).

### 5. Demo data (optional)

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:demo
# sign in as alex@demo.lifeos.app / demo-password-1234
npm run seed:demo -- --clear       # removes the demo account entirely
```

### 6. Run

```bash
npm start          # then press i for iOS, a for Android, or scan with Expo Go
```

Expo Go covers everything except local notifications on some platforms; for a full
build use `npx expo prebuild` and `npm run ios` / `npm run android`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Expo dev server |
| `npm test` | Jest — logic, executor, offline queue, security and component tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply migrations with the CLI |
| `npm run db:bundle` | Regenerate the single pasteable setup file |
| `npm run db:verify` | Run the live database assertions (needs `DATABASE_URL`) |
| `npm run functions:serve` | Run edge functions locally with `.env` |
| `npm run functions:deploy` | Deploy all five functions |
| `npm run seed:demo` | Create the demo account |
| `npm run icons` | Regenerate the app icon set |
| `npm run release:check` | Refuses to pass while store configuration is incomplete |
| `npm run build:ios` / `build:android` | EAS production builds |

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example). In short:

**Client (bundled, safe):** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_ANALYTICS_ENABLED`, `EAS_PROJECT_ID`.

**Server (Supabase secrets, never bundled):** `ANTHROPIC_API_KEY`, `AI_NAME`,
`AI_REFUSAL_FALLBACK`, `TRANSCRIBE_PROVIDER`, `OPENAI_API_KEY`, the per-tier model
overrides (`AI_MODEL_FREE` / `AI_MODEL_PLUS` / `AI_MODEL_PRO` …), and the store
credentials (`APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`,
`GOOGLE_SERVICE_ACCOUNT_JSON`, `ANDROID_PACKAGE_NAME`, `STORE_WEBHOOK_SECRET`).

---

## How the AI works

1. The app calls the `ai-chat` edge function with a message and a mode
   (`chat`, `onboarding`, `plan_day`, `plan_week`, `daily_reset`, `life_reset`,
   `ninety_day`, `morning_brief`).
2. The function builds a context snapshot — profile, preferences, life areas, goals,
   habits, tasks, calendar, memory, recent reflections — using the caller's own
   credentials, so row level security still applies.
3. The model is called with the tool catalogue in
   [`supabase/functions/_shared/tools.ts`](supabase/functions/_shared/tools.ts). Those
   are the only actions it can take; there is no path from model output to raw SQL.
4. Each tool call is validated with the same zod schema the app knows about, then
   executed. Destructive or wide-reaching actions come back as
   `awaiting_confirmation` and are only run after the user taps approve — the
   arguments are replayed from the stored record, not from the client.
5. Every executed call is written back as a **receipt** on the assistant message. The
   UI renders receipts under the reply, which is why the assistant cannot claim
   something it did not do.

More detail: [docs/AI.md](docs/AI.md). Deployment and store setup:
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Every variable:
[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md). The device smoke test that has to pass
before a release: [docs/QA.md](docs/QA.md).

---

## Plans and usage

Four tiers — Free, Plus, Pro and Ultra — described by capability rather than by counters:

* **Free** — *Meet your AI.* The whole planner, a real assistant, one Life Reset a
  month and a taste of voice. Not a demo.
* **Plus** — *Build your life with your AI.* A more capable model, 90-day and advanced
  weekly planning, replanning, voice conversations, deeper memory, no caps on goals,
  habits or projects.
* **Pro** — *Unlock your AI's full potential.* The most capable model, advanced
  reasoning, Deep Life Analysis, the largest memory, priority processing.
* **Ultra** — *Let your AI do more.* Specialised agents — life, career, business,
  fitness, finance, learning — that read your whole plan, decide what to change and
  change it, then file a report.

Everything about the tiers lives in
[`supabase/functions/_shared/plans.ts`](supabase/functions/_shared/plans.ts) and can be
changed at runtime from the `app_config.plans` row — prices, quotas, entitlements,
trial lengths and even which model each tier uses — without shipping a build. No screen
contains a price, a limit, a plan name or a model id.

Usage is metered per billing period and weighted: a quick question costs one AI
request, a 90-day plan costs eight plus an advanced request. Everything metered goes
through one function on the server, which checks and spends atomically and refunds if
the work fails.

Reaching a limit never locks anyone out of their own life — goals, tasks, habits,
projects, the calendar and the Life Map stay open, and only new AI requests pause.
Cancelling deletes nothing. Details in [docs/BILLING.md](docs/BILLING.md).

## What the assistant can do

Beyond conversation, four things it produces are stored and readable later:

* **Deep Life Analysis** — a wide pass over goals against their dates, habits over
  weeks, and where time actually goes. It changes nothing; it is for seeing.
* **Agent runs** — a specialised agent works through up to sixteen rounds of tool
  calls, makes the changes and files a report of what it changed and what it left.
* **Weekly review** — an honest look back, then next week set up.
* **Proactive insights** — computed on device from your own data, so they are instant,
  free and available offline on every plan. A goal that has stopped moving, a deadline
  the current pace will miss, a week that does not fit, a habit that has slipped.

## Offline

Recent plans, tasks, goals and habits are cached per user. Completing a task, creating
one, rescheduling, and logging a habit all work offline: the change is applied locally
and queued in an outbox that replays in order when the connection returns. The pending
count is visible on Home — nothing is silently dropped.

---

## Renaming the product

Edit `src/config/brand.json`. The Expo config, the tab bar, the paywall and the
assistant's name all read from it.

---

## Tests

```bash
npm test
```

Covers the tool catalogue and argument validation, the tool executor against a fake
database (ownership checks, entitlement gating, memory capacity), the whole
subscription system (entitlement resolution across trial, grace, cancellation and
expiry; weighted usage; model routing; runtime configuration overrides), the offline
queue and cache, local planning heuristics, date handling, the confirmation and
limit-reached UI, and a security audit that fails if a table ships without row level
security, if a device could write its own usage or entitlement, if a model name is
hardcoded outside the catalogue, or if a secret appears in client code.
