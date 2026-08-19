# Meridian

An AI life planner. You talk about your life; it builds and maintains the plan —
goals, habits, projects, your week, today — and changes the plan when your life changes.

Meridian is a real mobile app (Expo / React Native / TypeScript) with a Supabase
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
  functions/ai-chat/     The assistant: context, tools, execution, receipts
  functions/transcribe/  Speech to text (needs a provider key)
  functions/daily-brief/ Morning briefing generation
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

Put the project URL and anon key in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

The anon key is safe in the app: every table has row level security and all policies
are scoped to `auth.uid()`.

### 3. The assistant

The AI runs in a Supabase Edge Function so the API key never reaches the device:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai-chat transcribe daily-brief
```

Without `ANTHROPIC_API_KEY` the app still works as a planner — the assistant returns a
clear "not configured" message rather than pretending. See [docs/AI.md](docs/AI.md).

### 4. Demo data (optional)

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:demo
# sign in as alex@demo.meridian.app / demo-password-1234
npm run seed:demo -- --clear       # removes the demo account entirely
```

### 5. Run

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
| `npm run db:push` | Apply migrations |
| `npm run functions:serve` | Run edge functions locally with `.env` |
| `npm run functions:deploy` | Deploy all three functions |
| `npm run seed:demo` | Create the demo account |
| `npm run build:ios` / `build:android` | EAS production builds |

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example). In short:

**Client (bundled, safe):** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_ANALYTICS_ENABLED`, `EAS_PROJECT_ID`.

**Server (Supabase secrets, never bundled):** `ANTHROPIC_API_KEY`, `AI_MODEL`,
`AI_EFFORT`, `AI_REFUSAL_FALLBACK`, `TRANSCRIBE_PROVIDER`, `OPENAI_API_KEY`.

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

More detail: [docs/AI.md](docs/AI.md).

---

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
database (including ownership checks and Pro gating), the offline queue and cache,
local planning heuristics, date handling, the confirmation UI, and a security audit
that fails if a table ships without row level security or a secret appears in client
code.
