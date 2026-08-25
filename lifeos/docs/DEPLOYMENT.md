# Deployment

Everything here is a real step someone has to take. Nothing in this document is done
by the code — the code is ready for it.

---

## 0. What you need before starting

| | Why |
|---|---|
| Supabase project | Database, auth, edge functions |
| Anthropic API key | The assistant |
| Apple Developer Program (€99/yr) | TestFlight, App Store, StoreKit |
| Google Play Developer account ($25 once) | Internal testing, Play Store, billing |
| An Expo account | EAS builds and submissions |
| A privacy policy and terms URL | Required by both stores |

Optional: an OpenAI key if you want voice input.

---

## 1. Environments

Three, kept apart by separate Supabase projects and separate `.env` files. The app
reads only `EXPO_PUBLIC_*`; everything else lives as a server secret.

| | Development | Staging | Production |
|---|---|---|---|
| Supabase project | `lifeos-dev` | `lifeos-staging` | `lifeos` |
| Store products | StoreKit local / Play internal | sandbox | live |
| EAS profile | `development` | `preview` | `production` |
| Model | cheaper (`AI_MODEL_*` overrides) | production models | production models |

```bash
cp .env.example .env                 # development
cp .env.example .env.production      # never committed — see .gitignore
```

---

## 2. Database

There are three ways to do this. Pick one.

### a. No terminal at all (recommended if you are not a developer)

1. Supabase dashboard → **SQL Editor** → **New query**.
2. Open [`supabase/dist/all-migrations.sql`](../supabase/dist/all-migrations.sql),
   copy the whole file, paste it in, press **Run**.
3. New query again → paste [`supabase/tests/verify.sql`](../supabase/tests/verify.sql)
   → **Run**. It ends with `ALL CHECKS PASSED` if the database is correct.

That single file is generated from the migrations and a test fails the build if the
two ever differ, so it is always the same schema the CLI would apply.

### b. From GitHub, by clicking

Add repository secrets (Settings → Secrets and variables → Actions), then
Actions → **LifeOS — deploy to Supabase** → **Run workflow**. This also deploys the
edge functions, which the SQL editor cannot do.

| Secret | Needed for |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | always |
| `SUPABASE_PROJECT_REF` | always |
| `SUPABASE_DB_PASSWORD` | only *Apply database migrations* |

Deploying the functions alone never touches the database, so if the schema was
applied by hand with method (a) the first two secrets are enough — turn *Apply
database migrations* off when you run the workflow.

### c. With the CLI

```bash
supabase link --project-ref <ref>
supabase db push                     # applies supabase/migrations in order
```

Migrations, in order:

| File | What it creates |
|---|---|
| `20260101000000_init.sql` | Enums, all core tables, indexes |
| `20260101000100_rls.sql` | RLS enabled + forced, policies scoped to `auth.uid()` |
| `20260101000200_functions.sql` | Triggers, derived progress, life score, privacy RPCs |
| `20260101000300_subscriptions.sql` | Tiers, metering, `app_config`, usage functions |
| `20260101000400_agents_insights.sql` | Agent/analysis reports, insights |
| `20260101000500_store_events.sql` | Store event ledger, rate limits, idempotent entitlement |
| `20260101000600_ai_router.sql` | AI request accounting, monetary budgets, provider health |

Verify afterwards — the scripted way is `supabase/tests/verify.sql`, which asserts
provisioning, metering, billing idempotency and that one user cannot read or write
another user's data. For a quick manual look:

```sql
-- Every table must have RLS on.
select relname, relrowsecurity, relforcerowsecurity
  from pg_class join pg_namespace n on n.oid = relnamespace
 where n.nspname = 'public' and relkind = 'r'
 order by relname;

-- No policy on user data should be missing auth.uid().
select tablename, policyname, qual from pg_policies where schemaname = 'public';
```

---

## 3. Server secrets

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  AI_NAME=LifeOS \
  STORE_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Apple — App Store Server API
supabase secrets set \
  APPLE_ISSUER_ID=... \
  APPLE_KEY_ID=... \
  APPLE_BUNDLE_ID=app.lifeos \
  APPLE_PRIVATE_KEY="$(cat SubscriptionKey_XXXXXXX.p8)"

# Google Play
supabase secrets set \
  ANDROID_PACKAGE_NAME=app.lifeos \
  GOOGLE_SERVICE_ACCOUNT_JSON="$(cat play-service-account.json | tr -d '\n')"

# Optional: voice
supabase secrets set TRANSCRIBE_PROVIDER=openai OPENAI_API_KEY=sk-...
```

Then deploy the functions (or use the GitHub workflow above, which does this for you):

```bash
supabase functions deploy ai-chat transcribe daily-brief subscription-verify
# The stores cannot send a JWT, so this one is addressed by its secret instead:
supabase functions deploy store-notifications --no-verify-jwt
```

---

## 4. Apple

### App Store Connect

1. Create the app with bundle id `app.lifeos`.
2. **Subscriptions** → create one group ("LifeOS") with six products:

   | Product ID | Duration |
   |---|---|
   | `lifeos.plus.monthly` | 1 month |
   | `lifeos.plus.yearly` | 1 year |
   | `lifeos.pro.monthly` | 1 month |
   | `lifeos.pro.yearly` | 1 year |
   | `lifeos.ultra.monthly` | 1 month |
   | `lifeos.ultra.yearly` | 1 year |

   Prices must match `supabase/functions/_shared/plans.ts` (or change the catalogue —
   the app reads the store's price at runtime either way).

3. Add a 7-day **introductory offer / free trial** on the plans that should have one.
4. **Users and Access → Integrations → In-App Purchase** → create a key, note the Key
   ID and Issuer ID, download the `.p8` **once**.
5. **App Information → App Store Server Notifications V2**:
   - Production URL: `https://<ref>.functions.supabase.co/store-notifications?key=<STORE_WEBHOOK_SECRET>`
   - Sandbox URL: the same.
   - Version: **Version 2**.

### Required for review

- Privacy policy URL and terms URL. Set them in `src/config/brand.json`; the paywall
  and Help screen show the links only once they are set, so nothing points at a page
  that does not exist. `npm run release:check` refuses to pass until they are.
- The paywall's subscription disclosure is in the app already.
- Sign-in credentials for a demo account (`npm run seed:demo` makes one).

---

## 5. Google Play

1. Create the app with package `app.lifeos`.
2. **Monetise → Subscriptions** → create the same six product ids, each with a base
   plan and (where wanted) a 7-day free trial offer tagged `trial`.
3. **Setup → API access** → link a Google Cloud project → create a service account
   with the **Android Publisher** role → download the JSON key. Grant it "View
   financial data" and "Manage orders and subscriptions" in Play Console.
4. **Monetise → Monetisation setup → Real-time developer notifications**:
   - Create a Pub/Sub topic, then a **push subscription** pointing at
     `https://<ref>.functions.supabase.co/store-notifications?key=<STORE_WEBHOOK_SECRET>`
   - Paste the topic name into Play Console and send a test notification.

---

## 6. Builds

```bash
npm install -g eas-cli && eas login
eas build:configure

# Fill in the real ids in eas.json → submit.production first.

eas build --profile development --platform ios       # device build, dev client
eas build --profile development --platform android
eas build --profile production --platform all
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

`expo-iap` is a native module: **purchases only work in a development or store build.**
In Expo Go the paywall says so rather than pretending.

---

## 7. Testing purchases on a device

### iOS (StoreKit sandbox)

1. App Store Connect → **Users and Access → Sandbox → Test Accounts** → create one.
2. On the device: Settings → App Store → sign out of the sandbox account, then install
   the development build.
3. Buy inside the app; iOS will prompt for the sandbox account. Sandbox renewals are
   accelerated (a month ≈ 5 minutes), which makes renewal and expiry easy to observe.
4. Watch `store_events` in Supabase — every verification and notification lands there.

### Android (Play internal testing)

1. Upload a build to the **internal testing** track and add your account as a tester.
2. Play Console → **Setup → License testing** → add the account so purchases are free.
3. Install through the internal testing link (not a sideloaded APK — billing needs the
   Play-installed build).

### What to check on a real device

The full ordered checklist is [QA.md](QA.md). In short:

- [ ] App launches, sign-up and sign-in work
- [ ] Life interview completes and builds a plan
- [ ] A conversation creates real tasks, and the receipts match what appears
- [ ] Notifications arrive (briefing, reset, a timed task)
- [ ] Paywall shows **store** prices in the local currency
- [ ] A purchase completes and the plan changes within seconds
- [ ] Delete the app, reinstall, sign in, **Restore purchases** returns the plan
- [ ] Cancel in store settings: access continues to the period end
- [ ] Let a sandbox subscription expire: the app drops to Free and keeps every goal,
      task, habit and plan
- [ ] Ultra: an agent run makes real changes and files a report

---

## 8. Release checklist

- [ ] Migrations applied to the production project
- [ ] All secrets set; `supabase secrets list` shows them
- [ ] Functions deployed (`store-notifications` with `--no-verify-jwt`)
- [ ] Six products live in both stores at the catalogue prices
- [ ] Server notifications configured and a test event received
- [ ] Privacy policy and terms URLs live and set in `src/config/brand.json`
- [ ] `npm run release:check` passes
- [ ] App icons generated (`npm run icons`) or replaced with designed artwork
- [ ] `EAS_PROJECT_ID` set so push notifications register
- [ ] Sandbox purchase, restore, cancel and expiry all verified on a device
- [ ] Demo account prepared for review
- [ ] App privacy answers filled in (see below)

### App privacy disclosure

The app collects: account email, and the life data the user enters (goals, tasks,
habits, reflections, conversations). Conversations are sent to Anthropic to generate
replies. Analytics record event names only — never content. Everything is deletable
in-app: **Settings → Privacy** offers export, forget-everything and account deletion.
