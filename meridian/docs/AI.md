# The assistant

## Shape of the integration

```
app  ──►  supabase/functions/ai-chat  ──►  Anthropic Messages API
              │
              ├── buildContext()      reads the user's life with their own JWT (RLS applies)
              ├── anthropicTools()    the fixed tool catalogue, generated from zod schemas
              ├── executeTool()       validates arguments, then runs one fixed query
              └── receipts            written onto the assistant message
```

The API key is a Supabase secret. It is never in the app bundle, and the client cannot
call the model provider directly — there is a test that fails if it ever does.

## Configuration

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set AI_MODEL=claude-opus-5          # optional, this is the default
supabase secrets set AI_EFFORT=high                  # low | medium | high | xhigh | max
supabase secrets set AI_REFUSAL_FALLBACK=true        # optional
supabase functions deploy ai-chat transcribe daily-brief
```

`AI_EFFORT` trades latency for depth. `high` is the default and suits planning work;
`medium` noticeably shortens onboarding turns if you want a snappier first run.

`AI_REFUSAL_FALLBACK` opts into the server-side refusal fallback. If the account is not
enrolled in that beta, the function detects the rejection once and quietly falls back to
the standard call for the rest of the isolate's life — no configuration needed.

Without `ANTHROPIC_API_KEY` the endpoint returns `503 ai_not_configured` and the app
shows: *"I'm having trouble connecting right now. Your existing plan is still
available."* Everything that is not the assistant keeps working.

## Modes

| Mode | Used by | What it changes |
|---|---|---|
| `chat` | Talk tab | General conversation; acts when action is what is needed |
| `onboarding` | Life interview | Interviews, then builds areas, goals, habits, projects, today |
| `plan_day` | "Plan my day" | Reads the day, schedules realistically, writes the daily plan |
| `plan_week` | "Plan my week" | Compares load against capacity, names what to move (Pro) |
| `daily_reset` | Daily Reset | Records the reflection, ticks off work, reshapes tomorrow |
| `life_reset` | Life Reset | Deeper interview, then rebuilds the plan (Pro) |
| `ninety_day` | 90-day plan | Three months, weekly objectives (Pro) |
| `morning_brief` | Briefing | Writes today's headline and summary onto the daily plan |

## The tool catalogue

`supabase/functions/_shared/tools.ts` is the single source of truth, imported by both
the app and the function. Each tool has a zod schema; the JSON schema sent to the model
is generated from it, so the thing that is documented and the thing that is validated
cannot drift apart.

Read tools: `get_today`, `get_week`, `get_goals`, `get_habits`, `get_projects`,
`get_life_areas`, `get_progress`, `get_tasks`, `get_memory`.

Write tools cover goals and milestones, tasks, habits and logs, projects and
milestones, calendar events, daily/weekly/90-day plans, life areas, reflections,
reminders, memory, planning preferences, and finishing onboarding.

### Confirmation

These require explicit user approval and are never executed on the model's word alone:

`delete_goal`, `delete_task`, `delete_habit`, `delete_project`, `delete_event`,
`reorganize_day`, `replan_week`.

When one is called, the function records an `awaiting_confirmation` receipt containing
the proposed arguments and tells the model, in the tool result, that **nothing has
happened yet**. The app shows an approval card. On approve, the function reloads the
stored arguments and runs them — the client cannot substitute different ones.

### Pro gating

`create_weekly_plan`, `replan_week` and `generate_90_day_plan` are Pro-only. On a free
account they return `requires_pro`, the model is told plainly, and the receipt says
"Not done — this is a Pro feature".

## Why the assistant cannot lie about actions

* Tool results carry the real outcome, including failures and "row does not exist".
* Receipts are written from execution results, not from the reply text.
* The UI renders receipts under every message, so a claim with no receipt is visible.
* If the model or network dies mid-turn, anything already executed is still saved with
  a message saying so.

## Voice

`transcribe` accepts a recording and returns text. It needs a provider:

```bash
supabase secrets set TRANSCRIBE_PROVIDER=openai OPENAI_API_KEY=sk-...
```

Without it the endpoint returns `501 transcription_not_configured` and the microphone
button explains that voice is not configured on this server. It never fabricates a
transcript.

## Cost control

* The system prompt is split so the stable half is cached across turns.
* Free accounts are capped at `FREE_LIMITS.aiMessagesPerDay` conversations per day,
  counted server-side in `ai_usage` through a `security definer` function — the client
  cannot bypass it.
* The tool loop is capped at 8 rounds per turn.
