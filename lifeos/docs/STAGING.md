# Staging validation

The gate between "the AI router passes its tests" and "the AI router is trusted with
real users". Nothing in production is touched by any step here, and Anthropic is not
removed until every check below has passed.

Staging is a **separate Supabase project**. That is the whole point: real provider calls,
real money, real tool execution, against a database that contains nobody's life.

---

## 0. What you need first

| | Why | Secret? |
|---|---|---|
| A second Supabase project, named `lifeos-staging` | Isolation from production | ref is public, DB password is secret |
| Google Gemini API key, **paid billing enabled** | Primary provider | **Yes** |
| Groq API key, Developer tier | Fast tier and transcription | **Yes** |
| Mistral API key | EU / sensitive data and EU transcription | **Yes** |

No OpenAI key. No Anthropic key — staging exercises the new path only.

> Provider keys go into the staging project's Edge Function secrets and into your local
> shell for the integration suite. They are never pasted into a chat, committed, or put
> in a GitHub repository secret.

---

## 1. Create the staging project

Supabase dashboard → **New project** → name `lifeos-staging`. Choose a region near you
and save the database password somewhere safe.

Then Project Settings → API, and note the **Project URL** and the **anon** key. Both are
safe to share; the `service_role` key is not and is never needed by hand.

## 2. Apply the schema

SQL Editor → paste [`supabase/dist/all-migrations.sql`](../supabase/dist/all-migrations.sql)
→ **Run**. Then a new query with [`supabase/tests/verify.sql`](../supabase/tests/verify.sql)
→ **Run**. It must end with `ALL CHECKS PASSED`, including check 9, which covers the AI
budget reservation and settlement.

## 3. Set the provider secrets

Staging project → **Edge Functions** → **Secrets** → add:

```
GOOGLE_GEMINI_API_KEY
GROQ_API_KEY
MISTRAL_API_KEY
```

Names exactly as written. No other AI secret is needed.

## 4. Deploy the functions

GitHub → Settings → Secrets and variables → Actions, add:

```
STAGING_SUPABASE_ACCESS_TOKEN
STAGING_SUPABASE_PROJECT_REF
STAGING_SUPABASE_DB_PASSWORD    (only if you want the workflow to apply migrations)
```

Then Actions → **LifeOS — deploy to staging** → Run workflow → choose the LifeOS branch.
The workflow refuses to run if the staging ref matches the production ref.

## 5. Turn the router on — in staging only

SQL Editor:

```sql
insert into app_config (key, value, is_public)
values ('ai_policy', '{"routerEnabled": true}'::jsonb, false)
on conflict (key) do update set value = app_config.value || excluded.value;
```

Production keeps `routerEnabled` false until you say otherwise.

---

## 6. The checks

Each one is pass or fail. A check that cannot run is **blocked** or **not configured** —
never a pass.

### Real provider calls

```bash
GOOGLE_GEMINI_API_KEY=... GROQ_API_KEY=... MISTRAL_API_KEY=... npm run test:integration
```

Per provider: a normalized response, token usage reported so cost is metered rather than
estimated, a real tool call, and an authentication failure that surfaces as a normalized
error. Then across providers: cheap routing for a simple task, quality routing for a deep
analysis, a genuine failover, and cost recorded for the failed attempt as well as the
successful one. Then transcription on Groq and Mistral.

A provider with no key reports **NOT CONFIGURED** and is not counted.

### End-to-end against staging

```bash
SUPABASE_URL=https://<staging-ref>.supabase.co SUPABASE_ANON_KEY=<anon> node scripts/smoke-test.mjs
```

Covers authentication, provisioning, reads and writes, RLS isolation between two real
accounts, entitlement integrity, store-event protection, the five edge functions, the AI
router tables, metering and account deletion.

### What must be true before production

- [ ] `verify.sql` — all 9 groups, including AI budgets
- [ ] Integration suite — Gemini, Groq and Mistral each returning a normalized response
- [ ] Tool calling confirmed on each provider that will carry tool traffic
- [ ] Transcription confirmed on at least one audio route
- [ ] Fallback observed recovering from a real provider failure
- [ ] `ai_requests` rows show `accounting_method = 'metered'`, not `estimated`
- [ ] `ai_budgets.spent` moves and settles; no orphaned rows in `ai_budget_reservations`
- [ ] Smoke test — no FAIL, and every BLOCKED explained
- [ ] Full unit suite, typecheck and lint clean

### Useful queries during the run

```sql
-- Which provider actually answered, and what it cost.
select provider, model, task_type, accounting_method,
       input_tokens, output_tokens, actual_cost, fallback_used, success
  from ai_requests order by created_at desc limit 20;

-- Money is settled, nothing is stuck on hold.
select spent, reserved, ceiling from ai_budgets;
select count(*) as orphaned_holds from ai_budget_reservations;

-- Providers the breaker has taken out of rotation.
select key, state, consecutive_failures from ai_provider_health where state <> 'closed';
```

---

## 7. Only then

Production deployment and the removal of Anthropic (Phase 14) come after every box above
is ticked, and only on explicit approval. Until then the production rollback stays what it
has been all along: `ai_policy.routerEnabled` is false, and the legacy path answers.
