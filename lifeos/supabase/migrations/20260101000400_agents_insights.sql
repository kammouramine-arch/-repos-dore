-- ============================================================================
-- What the assistant leaves behind: agent runs, deep analyses and weekly
-- reviews as durable reports, plus the proactive insights the app surfaces.
-- ============================================================================

-- Reports outlive the conversation that produced them, so a deep analysis or an
-- agent run can be read back weeks later without scrolling a chat.
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('deep_analysis', 'agent_run', 'weekly_review')),
  agent_key text,
  title text not null,
  body text not null,
  -- The receipts for whatever the run actually changed.
  actions jsonb not null default '[]'::jsonb,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

/*
  Proactive observations. Detection runs on the device from data already loaded, so
  everyone gets it instantly and offline; rows are stored only when the user's plan
  includes proactive notifications, so there is something to schedule from.
*/
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info', 'attention', 'urgent')),
  entity_type text,
  entity_id uuid,
  status text not null default 'new' check (status in ('new', 'seen', 'dismissed', 'acted')),
  -- The same observation should not be raised twice in a day.
  fingerprint text not null,
  valid_until date,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index on public.ai_reports (user_id, created_at desc);
create index on public.insights (user_id, status, created_at desc);

alter table public.ai_reports enable row level security;
alter table public.ai_reports force row level security;
alter table public.insights enable row level security;
alter table public.insights force row level security;

alter table public.ai_reports alter column user_id set default auth.uid();
alter table public.insights   alter column user_id set default auth.uid();

do $$
declare t text;
begin
  foreach t in array array['ai_reports', 'insights']
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

-- Reports and insights are part of the export and of "forget everything".
create or replace function public.forget_everything()
returns void language plpgsql security invoker as $$
begin
  delete from public.ai_messages where user_id = auth.uid();
  delete from public.ai_conversations where user_id = auth.uid();
  delete from public.ai_memory where user_id = auth.uid();
  delete from public.ai_reports where user_id = auth.uid();
  delete from public.insights where user_id = auth.uid();
end $$;

create or replace function public.export_my_data()
returns jsonb language sql stable security invoker as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile',        (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'preferences',    (select to_jsonb(x) from public.user_preferences x where x.user_id = auth.uid()),
    'subscription',   (select to_jsonb(x) from public.subscriptions x where x.user_id = auth.uid()),
    'life_areas',     coalesce((select jsonb_agg(to_jsonb(x)) from public.life_areas x where x.user_id = auth.uid()), '[]'::jsonb),
    'goals',          coalesce((select jsonb_agg(to_jsonb(x)) from public.goals x where x.user_id = auth.uid()), '[]'::jsonb),
    'goal_milestones',coalesce((select jsonb_agg(to_jsonb(x)) from public.goal_milestones x where x.user_id = auth.uid()), '[]'::jsonb),
    'projects',       coalesce((select jsonb_agg(to_jsonb(x)) from public.projects x where x.user_id = auth.uid()), '[]'::jsonb),
    'habits',         coalesce((select jsonb_agg(to_jsonb(x)) from public.habits x where x.user_id = auth.uid()), '[]'::jsonb),
    'habit_logs',     coalesce((select jsonb_agg(to_jsonb(x)) from public.habit_logs x where x.user_id = auth.uid()), '[]'::jsonb),
    'tasks',          coalesce((select jsonb_agg(to_jsonb(x)) from public.tasks x where x.user_id = auth.uid()), '[]'::jsonb),
    'calendar_events',coalesce((select jsonb_agg(to_jsonb(x)) from public.calendar_events x where x.user_id = auth.uid()), '[]'::jsonb),
    'daily_plans',    coalesce((select jsonb_agg(to_jsonb(x)) from public.daily_plans x where x.user_id = auth.uid()), '[]'::jsonb),
    'weekly_plans',   coalesce((select jsonb_agg(to_jsonb(x)) from public.weekly_plans x where x.user_id = auth.uid()), '[]'::jsonb),
    'life_plans',     coalesce((select jsonb_agg(to_jsonb(x)) from public.life_plans x where x.user_id = auth.uid()), '[]'::jsonb),
    'reflections',    coalesce((select jsonb_agg(to_jsonb(x)) from public.reflections x where x.user_id = auth.uid()), '[]'::jsonb),
    'reports',        coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_reports x where x.user_id = auth.uid()), '[]'::jsonb),
    'insights',       coalesce((select jsonb_agg(to_jsonb(x)) from public.insights x where x.user_id = auth.uid()), '[]'::jsonb),
    'conversations',  coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_conversations x where x.user_id = auth.uid()), '[]'::jsonb),
    'messages',       coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_messages x where x.user_id = auth.uid()), '[]'::jsonb),
    'memory',         coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_memory x where x.user_id = auth.uid()), '[]'::jsonb),
    'usage',          coalesce((select jsonb_agg(to_jsonb(x)) from public.usage_counters x where x.user_id = auth.uid()), '[]'::jsonb)
  );
$$;
