# Subscriptions

## The model

Four tiers, positioned by capability rather than by counters.

| | **Free** — Meet your AI | **Plus** — Build your life with your AI | **Pro** — Unlock your AI's full potential | **Ultra** — Let your AI do more |
|---|---|---|---|---|
| Price | €0 | €9.99 / month · €79.99 / year | €19.99 / month · €159.99 / year | €49.99 / month · €399.99 / year |
| AI conversations | 120 a month | high limits · fair use | high limits · fair use | high limits · fair use |
| Model | standard | more capable | most capable we offer | maximum |
| Planning | daily + weekly | + 90-day, advanced weekly, replanning | + multi-step planning | + agents that execute |
| Memory | 40 items | 400 | 1,500 | 5,000 |
| Voice | 10 min a month | 3 h | 10 h | 30 h |
| Life Resets | 1 a month | 12 | 40 | 100 |
| Goals / habits / projects | 3 / 3 / 1 | no cap | no cap | no cap |
| Advanced reasoning | — | — | ✓ | ✓ |
| Priority processing | — | — | ✓ | ✓ |
| Deep Life Analysis | — | — | ✓ | ✓ |
| AI agents | — | — | — | 500 runs a month |
| Free trial | — | 7 days | 7 days | 7 days |

Free is a working product, not a demo: the whole planner, a real assistant, a Life
Reset and a taste of voice. What paid plans buy is **more thinking** — more requests,
a more capable model, deeper planning and longer memory.

**Ultra is sold because what it gates is built.** `AI_AGENTS` unlocks the specialised
agents in `supabase/functions/_shared/agents.ts` — life, career, business, fitness,
finance and learning — which read the whole plan, work through up to sixteen rounds of
tool calls, make the changes themselves and file a report. That is a real capability
difference, not a bigger number.

### Capabilities are never decorative

The entitlement union is deliberately small:

| Key | What it actually gates |
|---|---|
| `PLANNING_BASIC` | Daily and weekly planning operations |
| `PLANNING_ADVANCED` | 90-day plans, weekly AI plans, week-wide replanning tools |
| `VOICE_BASIC` | The transcription endpoint |
| `LIFE_RESET_BASIC` | Running a Life Reset |
| `ADVANCED_REASONING` | Deep Life Analysis, and the higher-effort model on advanced work |
| `PROACTIVE_AI` | The assistant scheduling a notification when something drifts |
| `AI_AGENTS` | Agent runs |
| `PRIORITY_PROCESSING` | Reduced latency where the model supports it |

Depth that is a number — memory capacity, voice minutes, how much AI — lives in
`quotas`, not in a flag. A test walks the source tree and **fails the build if an
available plan sells an entitlement that nothing in the codebase checks**.

## Where it all lives

Everything is one file: [`supabase/functions/_shared/plans.ts`](../supabase/functions/_shared/plans.ts).

```
plans.ts                  tiers · entitlements · quotas · costs · model routing · pricing
  ├── app (src/config/subscription.ts)     renders plans, gates UI, shows usage
  └── edge functions (_shared/config.ts)   resolves, checks, spends, routes the model
```

The app and the server resolve the *same* catalogue from the *same* subscription row,
so what the UI promises and what the server allows cannot drift apart.

### Nothing is hardcoded elsewhere

* No screen contains a price, a limit or a plan name.
* No screen asks "is this user Pro?" — it asks for a capability (`can('AI_AGENTS')`)
  or an allowance (`quota('ai_requests')`) through `useEntitlements()`.
* No model id appears outside the catalogue.

## Changing pricing, limits or models without a release

The `app_config` row `plans` holds a partial override that is deep-merged over the
compiled catalogue, on both the client and the server:

```sql
-- Run a €7.99 price experiment
update public.app_config
   set value = '{"plans":{"plus":{"pricing":{"monthly":{"amount":799}}}}}'::jsonb
 where key = 'plans';

-- Give the free tier more room
update public.app_config
   set value = '{"plans":{"free":{"quotas":{"ai_requests":200}}}}'::jsonb
 where key = 'plans';

-- Take a plan off sale, or put a future one on, without a release
update public.app_config
   set value = '{"plans":{"ultra":{"available":false}}}'::jsonb
 where key = 'plans';
```

Arrays replace wholesale (so an entitlement list can be redefined); objects merge key
by key (so one price changes without restating the plan). The server caches the
override for 60 seconds.

Models can also be overridden per environment with secrets — `AI_MODEL_FREE`,
`AI_MODEL_PLUS`, `AI_MODEL_PRO`, `AI_MODEL_PRO_ADVANCED`, and the matching
`AI_EFFORT_*`. Useful for trying a model on staging before it reaches everyone.

## Usage: one central path

Every metered thing goes through `spendForOperation()` in
[`_shared/config.ts`](../supabase/functions/_shared/config.ts). There is no per-screen
or per-endpoint quota logic anywhere.

**Weighted costs** — a quick question is not the same as rebuilding someone's life:

| Operation | Cost |
|---|---|
| Conversation | 1 AI request |
| Plan my day | 2 AI + 1 planning |
| Plan my week | 3 AI + 2 planning |
| Life Reset | 4 AI + 1 reset + 2 planning |
| 90-day plan | 8 AI + 1 advanced + 4 planning |
| Deep life analysis | 6 AI + 2 advanced |
| Agent run | 4 AI + 1 agent run |
| Voice | 1 voice-second per second recorded |

The check and the increment happen together inside `consume_usage()`, so two
concurrent requests cannot both take the last unit. If a later meter in the same
operation fails, the earlier ones are refunded — a rejected request costs nothing. So
does a request that dies before producing anything.

**Periods** follow the subscription's billing period, or the calendar month for free
accounts. The app derives the period with the same function the server uses.

## What happens at a limit

The user is never locked out of their own life. `LimitReached` states it plainly:

> **You've reached your current AI limit.** Your life plan is still here — nothing is
> locked. Your goals, tasks, habits, projects, calendar and Life Map are open as
> usual. Only new AI requests are paused. Your allowance resets on 1 April.

with *Upgrade to Plus* and *View plans*. Everything except new AI requests keeps
working, offline cache included.

The word "unlimited" appears nowhere: generous allowances are described as
"high limits · fair use", and a test fails the build if that changes.

## Subscription state

`subscriptions` carries `tier`, `status`, the period, trial and grace timestamps, the
store identifiers and `will_renew`. `resolveEntitlement()` turns that into what
applies right now:

| Status | Effect |
|---|---|
| `trialing` | full plan until `trial_ends_at` |
| `active` | full plan until `current_period_end` |
| `grace_period` | full plan until `grace_until` — billing is being retried |
| `canceled` | full plan until the period they already paid for ends |
| `expired` | Free allowances |

**Cancelling deletes nothing.** Goals, tasks, habits, projects, plans, reflections and
memories all stay. Only AI capability returns to Free, and resubscribing picks up
exactly where they left off.

## Store integration

### What is implemented

* `subscription-verify` edge function: Apple receipt verification (`verifyReceipt`
  with sandbox fallback on status 21007) and Google Play
  (`purchases.subscriptionsv2`, with the service-account JWT exchange implemented in
  Deno's WebCrypto — no dependencies).
* Product id → plan mapping from the catalogue, so adding a plan needs no code change.
* Status mapping including trials, grace periods, cancellation and expiry.
* One store subscription can only be attached to one account: re-verifying a
  transaction that belongs elsewhere returns `409 already_claimed`.
* The write happens with the service role. `subscriptions` is **read-only** to the
  user, so a device cannot promote itself.
* Restore purchases: every receipt the store account owns is re-verified, and the one
  granting access furthest into the future wins.

### The native billing SDK

Implemented with [`expo-iap`](https://github.com/hyochan/expo-iap) — StoreKit 2 on iOS,
Google Play Billing on Android:

* [`src/services/purchases/storeAdapter.ts`](../src/services/purchases/storeAdapter.ts)
  implements `PurchaseAdapter` (`isAvailable`, `init`, `getProducts`, `purchase`,
  `restore`) against `expo-iap`'s event-based purchase API, bridging
  `purchaseUpdatedListener`/`purchaseErrorListener` back to a plain promise.
* [`src/services/purchases/index.ts`](../src/services/purchases/index.ts) wires it up
  at startup (`initPurchases`) only in a build where the native module actually exists
  (`Constants.appOwnership !== 'expo'`); in Expo Go, or if the module fails to load, the
  app keeps `unavailableAdapter`, which reports "not configured" honestly instead of a
  button that silently does nothing.
* A purchase is never granted client-side: `purchase()` opens the store sheet, sends the
  resulting receipt (a StoreKit 2 JWS on iOS, a purchase token on Android) to
  `subscription-verify`, and only calls `finishTransaction` **after** the server
  verifies it. If verification fails, the transaction stays open and the store
  redelivers it on next launch — a paid purchase is never silently lost.
* Restore purchases re-verifies every receipt the store account owns and keeps the one
  that grants access furthest into the future (`pickBetter`).
* `store-notifications` handles Apple's App Store Server Notifications V2 and Google's
  Real-Time Developer Notifications, so renewals, cancellations and refunds update
  `subscriptions` without the app needing to open. `store_events` (unique on
  `(provider, event_id)`) makes replays a no-op on both the verification and
  notification paths.

To turn this on for a specific store:

1. Create the six products with the ids from the catalogue —
   `lifeos.plus.monthly`, `lifeos.plus.yearly`, `lifeos.pro.monthly`,
   `lifeos.pro.yearly`, `lifeos.ultra.monthly`, `lifeos.ultra.yearly`.
2. Set the server secrets (see [ENVIRONMENT.md](ENVIRONMENT.md)):
   ```bash
   supabase secrets set \
     APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_BUNDLE_ID=com.aminekammour.lifeos \
     APPLE_PRIVATE_KEY="$(cat SubscriptionKey_XXXXXXX.p8)"
   supabase secrets set \
     GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json | tr -d '\n')" \
     ANDROID_PACKAGE_NAME=com.aminekammour.lifeos
   supabase secrets set STORE_WEBHOOK_SECRET=$(openssl rand -hex 32)
   supabase functions deploy subscription-verify store-notifications --no-verify-jwt
   ```
3. Point App Store Server Notifications V2 and Google RTDN at
   `https://<ref>.functions.supabase.co/store-notifications?key=<STORE_WEBHOOK_SECRET>`
   (see [DEPLOYMENT.md](DEPLOYMENT.md) §4–5 for the exact console steps).
4. Purchases only work in a development or store build — `expo-iap` is a native module,
   so Expo Go cannot load it.

> The verification requests are written to the documented shapes of both stores, but
> they have not been run against live store credentials from this environment. Test
> them with a sandbox purchase (iOS) and a licence-test account (Android) before
> release — see [QA.md](QA.md) section D.

## Trials

`trialDays` is per plan in the catalogue (7 for Plus and Pro, 0 for Free/Ultra) and is
configurable like everything else. The store owns the actual trial: the paywall shows
"Try 7 days free" when the plan offers one, and `subscription-verify` records
`trialing` with `trial_ends_at` from the receipt.

## Testing without a store

```sql
update public.subscriptions
   set tier = 'pro', status = 'active', provider = 'promo',
       current_period_start = now(), current_period_end = now() + interval '30 days'
 where user_id = '<uuid>';
```

or seed a whole demo account on a paid plan:

```bash
npm run seed:demo -- --plan=plus
```

## Analytics

`paywall_viewed` and `subscription_started` (with tier and period) are tracked. As
everywhere else, no user content is included.
