# LifeOS — device QA checklist

The end-to-end smoke test. Every step here needs a real device and a real store
account, which is why none of it can be signed off from a build machine.

Run it on **both** iOS and Android before any release. Record the date, build number
and tester next to each run.

> Prerequisites: a development or TestFlight/internal-testing build (purchases are
> native and do not work in Expo Go), a Supabase project with the migrations applied
> and the secrets set, six products live in the store console, and a sandbox / licence
> test account.

---

## A. First run

| # | Step | Expected |
|---|---|---|
| 1 | Install LifeOS | App installs, icon and name read *LifeOS* |
| 2 | Launch | Splash, then the welcome screen with the tagline. No flash of an unstyled screen |
| 3 | Sign up | Account is created; if email confirmation is on, the app says so plainly |
| 4 | Complete the life interview | The assistant asks, adapts, and does not repeat questions already answered |
| 5 | Finish onboarding | The reveal screen lists areas, goals, habits and today's actions that actually exist |

## B. The core loop

| # | Step | Expected |
|---|---|---|
| 6 | Open Home | Greeting, one honest contextual line, at most three priorities |
| 7 | Open Talk | Conversation opens with context; the assistant knows what was said in onboarding |
| 8 | Ask something meaningful ("I'm overwhelmed this week") | A useful, specific reply — not a generic pep talk |
| 9 | Ask it to create a task | A receipt appears under the reply naming the task |
| 10 | Return to Home / Plan | **The task is really there**, matching the receipt exactly |
| 11 | Open Life Map | Areas render with progress derived from real goals and habits |
| 12 | Add an area, rename it, rate it, hide it | Each change persists across an app restart |

## C. Intelligence

| # | Step | Expected |
|---|---|---|
| 13 | Open Insights → Deep Life Analysis (Pro+) | Runs, and quotes your own numbers back |
| 14 | Read the report | Stored under past analyses; still there after a restart |
| 15 | Open Proactive Insights | Each observation is explainable from data you can see |
| 16 | Tap an insight | Opens Talk with the relevant question prefilled — never a dead end |
| 17 | Open Weekly Review | Summarises the real week; ends with a stored reflection |
| 18 | Check the numbers | Counts match what the Plan tab shows |

## D. Subscription

| # | Step | Expected |
|---|---|---|
| 19 | Open the paywall | Four plans, monthly/yearly toggle, trial copy where configured |
| 20 | Check prices | **Store-localised prices in the device's currency**, not the catalogue defaults |
| 21 | Start a sandbox purchase / trial | Store sheet opens; purchase completes |
| 22 | Watch the app | Plan changes within a few seconds; `store_events` has exactly one new row |
| 23 | Delete the app, reinstall, sign in, Restore purchases | The plan comes back |
| 24 | Cancel in store settings | App shows "cancelled — access until <date>"; capabilities still work |
| 25 | Wait for period end (sandbox accelerates this) | Access ends |
| 26 | Check the tier | Drops to Free |
| 27 | Check the data | **Every goal, task, habit, project, plan and reflection is still there** |

## E. Ultra

| # | Step | Expected |
|---|---|---|
| 28 | Upgrade to Ultra | Agents become available |
| 29 | Open Agents | Six agents listed; remaining runs shown |
| 30 | Run an agent | It reads, decides, and **actually changes something** |
| 31 | Check the changes | The tasks/goals it reports appear in the app |
| 32 | Read the report | Filed under past runs with receipts for each change |
| 33 | Check the quota | Remaining runs decreased by exactly one |
| 34 | Try to double-submit a run | Second attempt spends its own allowance; no duplicated changes |
| 35 | Ask an agent to delete something | It **asks first**; declining changes nothing |

## F. Platform and isolation

| # | Step | Expected |
|---|---|---|
| 36 | Notifications | Morning briefing, daily reset and a timed task reminder all arrive |
| 37 | Turn a notification preference off | Its notification stops |
| 38 | Aeroplane mode | Today, goals, habits still readable; a completed task syncs on reconnect |
| 39 | Sign out, sign in as a second account | **None of the first account's data is visible** |
| 40 | Second account's plan | Free — the first account's subscription did not follow |
| 41 | Delete the second account (Settings → Privacy) | Account and data are gone; app returns to welcome |

---

## Server-side checks during the run

Keep the Supabase dashboard open:

```sql
-- One row per store event, no duplicates.
select provider, event_id, kind, status, created_at
  from store_events order by created_at desc limit 20;

-- Usage should move only when something actually ran.
select meter, used from usage_counters
 where user_id = '<uuid>' and period_start = date_trunc('month', now())::date;

-- Every agent run leaves a report.
select kind, agent_key, title, created_at from ai_reports order by created_at desc limit 10;
```

## What a failure looks like

Stop and fix rather than shipping if any of these happen:

- A receipt claims a change the app does not show.
- A purchase completes but the tier does not change within ~10 seconds.
- Restore returns nothing for an account that owns a subscription.
- Expiry removes, hides or empties any user data.
- A second account can see the first account's anything.
- An agent reports "done" for something that did not happen.
- The paywall shows catalogue prices on a device where the store is reachable.
