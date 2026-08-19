# Backend

## Migrations

| File | Contents |
|---|---|
| `20260101000000_init.sql` | Enums, all tables, indexes |
| `20260101000100_rls.sql` | Row level security: enable, force, and per-table policies |
| `20260101000200_functions.sql` | Triggers, derived progress, life score, privacy RPCs |

Apply with `supabase db push`, or `supabase db reset` locally to rebuild from scratch.

## Security model

* Every table has RLS **enabled and forced**, including for the table owner.
* Every policy compares against `auth.uid()`.
* `user_id` defaults to `auth.uid()`, so the client never sends one, and a forged one
  is rejected by the `WITH CHECK` clause anyway.
* `subscriptions` is readable but not writable by the user — tier changes come from a
  verified purchase path using the service role.
* `ai_usage` is readable by its owner and written only by a `security definer`
  function, so the free-tier limit cannot be reset from a device.
* The service role key is used in exactly two places: the `increment_ai_usage` call
  inside the edge function, and the local demo-seed script.

## Derived data

Progress is computed, never trusted from the client:

* A goal's progress is milestone completion, or task completion when it has no
  milestones. Triggers recompute it whenever a milestone or linked task changes.
* The same holds for projects.
* `get_life_progress()` blends goal progress (50%), habit consistency over 14 days
  (30%) and recent task completion (20%), weighting only the parts that exist, so an
  area with no habits is not punished for it.
* `get_habit_streak(habit_id)` counts back from today (or yesterday, if today has not
  happened yet).

## Privacy RPCs

| Function | Purpose |
|---|---|
| `export_my_data()` | Everything held about the caller, as JSON |
| `forget_everything()` | Deletes conversations and memory, keeps plans |
| `delete_my_account()` | Deletes the auth user; every table cascades |

## Edge functions

| Function | Auth | Purpose |
|---|---|---|
| `ai-chat` | User JWT | The assistant: context, tools, execution, receipts |
| `transcribe` | User JWT | Speech to text (needs a provider) |
| `daily-brief` | User JWT | Generates the morning briefing and stores it on today's plan |

Run locally with `npm run functions:serve` (reads `.env`).

### Optional: scheduled briefings

`daily-brief` is called by the app when it opens in the morning, which needs no
scheduler. If you want it generated server-side too, enable `pg_cron` and
`pg_net` in your project and schedule a call per user — the function requires a user
JWT, so a scheduled job must mint one per user rather than using the service role.
This is deliberately not wired up by default: a half-working scheduler that silently
skips users is worse than none.

## Adding a new AI capability

1. Add the zod schema and metadata to `supabase/functions/_shared/tools.ts`.
2. Add the handler to `supabase/functions/_shared/executor.ts` — one fixed query, and
   an ownership check for any id it accepts.
3. If it is destructive or wide-reaching, set `requiresConfirmation: true` and add a
   line to `describeAction` so the approval card reads like a sentence.
4. Add a case to `__tests__/executor.test.ts`.
