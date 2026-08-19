-- ============================================================================
-- Row level security. Default deny; every policy is scoped to auth.uid().
-- Client code never sends a user_id — it is defaulted and enforced here.
-- ============================================================================

-- Default user_id to the authenticated user so a client cannot write another
-- user's rows even if it tries; the WITH CHECK below rejects it regardless.
alter table public.life_areas        alter column user_id set default auth.uid();
alter table public.goals             alter column user_id set default auth.uid();
alter table public.goal_milestones   alter column user_id set default auth.uid();
alter table public.projects          alter column user_id set default auth.uid();
alter table public.project_milestones alter column user_id set default auth.uid();
alter table public.habits            alter column user_id set default auth.uid();
alter table public.habit_logs        alter column user_id set default auth.uid();
alter table public.tasks             alter column user_id set default auth.uid();
alter table public.calendar_events   alter column user_id set default auth.uid();
alter table public.daily_plans       alter column user_id set default auth.uid();
alter table public.weekly_plans      alter column user_id set default auth.uid();
alter table public.life_plans        alter column user_id set default auth.uid();
alter table public.life_plan_items   alter column user_id set default auth.uid();
alter table public.reflections       alter column user_id set default auth.uid();
alter table public.ai_conversations  alter column user_id set default auth.uid();
alter table public.ai_messages       alter column user_id set default auth.uid();
alter table public.ai_memory         alter column user_id set default auth.uid();
alter table public.notifications     alter column user_id set default auth.uid();
alter table public.analytics_events  alter column user_id set default auth.uid();

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_preferences','subscriptions','life_areas','goals','goal_milestones',
    'projects','project_milestones','habits','habit_logs','tasks','calendar_events',
    'daily_plans','weekly_plans','life_plans','life_plan_items','reflections',
    'ai_conversations','ai_messages','ai_memory','ai_usage','notifications','analytics_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- profiles / preferences / subscriptions are keyed by the user id itself.
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile write"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete using (auth.uid() = id);

create policy "own prefs" on public.user_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Subscription state is written by verified purchase webhooks (service role),
-- which bypasses RLS; the client may only read it.
create policy "own subscription read" on public.subscriptions for select using (auth.uid() = user_id);

-- ai_usage is a server-side counter: readable by its owner, written by the edge function.
create policy "own usage read" on public.ai_usage for select using (auth.uid() = user_id);

do $$
declare t text;
begin
  foreach t in array array[
    'life_areas','goals','goal_milestones','projects','project_milestones','habits',
    'habit_logs','tasks','calendar_events','daily_plans','weekly_plans','life_plans',
    'life_plan_items','reflections','ai_conversations','ai_messages','ai_memory',
    'notifications','analytics_events'
  ]
  loop
    execute format(
      'create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
