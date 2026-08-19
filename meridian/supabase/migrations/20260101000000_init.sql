-- ============================================================================
-- Meridian — core schema
-- Every table is owned by a user and protected by row level security.
-- Policies compare against auth.uid(); the client never supplies a user id.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----
create type life_area_key as enum (
  'health','career','money','relationships','family','growth',
  'learning','business','social','travel','hobbies','other'
);
create type priority_level as enum ('low','medium','high');
create type goal_status as enum ('active','paused','completed','archived');
create type task_status as enum ('todo','done','skipped','cancelled');
create type energy_level as enum ('low','medium','high');
create type habit_cadence as enum ('daily','weekly','custom');
create type habit_log_status as enum ('done','skipped','missed');
create type plan_horizon as enum ('month','week');
create type reflection_kind as enum ('daily_reset','weekly_review','journal','life_reset');
create type conversation_kind as enum (
  'general','onboarding','daily_reset','weekly_review','life_reset','planning'
);
create type message_role as enum ('user','assistant','system');
create type memory_kind as enum (
  'preference','routine','constraint','fact','relationship','schedule','value'
);
create type subscription_tier as enum ('free','pro');
create type record_source as enum ('user','ai','import');

-- ------------------------------------------------------------- profiles ----
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wake_time time not null default '07:00',
  sleep_time time not null default '23:00',
  work_start time not null default '09:00',
  work_end time not null default '18:00',
  working_days smallint[] not null default '{1,2,3,4,5}',        -- 0 = Sunday
  daily_capacity_minutes int not null default 240,
  planning_style text not null default 'balanced',               -- gentle | balanced | ambitious
  ai_tone text not null default 'direct',                        -- warm | direct | coach
  memory_enabled boolean not null default true,
  analytics_enabled boolean not null default true,
  voice_enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  morning_brief_enabled boolean not null default true,
  morning_brief_time time not null default '07:30',
  daily_reset_enabled boolean not null default true,
  daily_reset_time time not null default '21:00',
  task_reminders_enabled boolean not null default true,
  weekly_review_enabled boolean not null default true,
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier subscription_tier not null default 'free',
  status text not null default 'active',
  platform text,                                                  -- ios | android | promo
  product_id text,
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------ life map ----
create table public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key life_area_key not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  satisfaction smallint check (satisfaction between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ---------------------------------------------------------------- goals ----
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  description text,
  why text,
  target_date date,
  priority priority_level not null default 'medium',
  status goal_status not null default 'active',
  progress smallint not null default 0 check (progress between 0 and 100),
  strategy jsonb not null default '[]'::jsonb,   -- AI-generated ordered steps
  source record_source not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  due_date date,
  is_done boolean not null default false,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- projects ----
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  status goal_status not null default 'active',
  due_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  notes text,
  source record_source not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  due_date date,
  is_done boolean not null default false,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- habits ----
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  cadence habit_cadence not null default 'daily',
  target_per_week smallint not null default 7 check (target_per_week between 1 and 21),
  days_of_week smallint[],                        -- for custom cadence, 0 = Sunday
  preferred_time time,
  duration_minutes int not null default 20,
  reminder_enabled boolean not null default false,
  is_active boolean not null default true,
  source record_source not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  status habit_log_status not null default 'done',
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- ---------------------------------------------------------------- tasks ----
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  habit_id uuid references public.habits(id) on delete cascade,
  title text not null,
  notes text,
  scheduled_date date,
  scheduled_time time,
  duration_minutes int not null default 30 check (duration_minutes between 1 and 1440),
  priority priority_level not null default 'medium',
  energy energy_level not null default 'medium',
  status task_status not null default 'todo',
  is_focus boolean not null default false,       -- one of the day's few real priorities
  order_index int not null default 0,
  source record_source not null default 'user',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------- calendar ----
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  notes text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  -- 'internal' today. External providers land here once an integration ships.
  provider text not null default 'internal',
  external_id text,
  source record_source not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

-- ---------------------------------------------------------------- plans ----
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  headline text,                                  -- the contextual line on Home
  summary text,
  focus jsonb not null default '[]'::jsonb,       -- [{task_id,title}] top priorities
  capacity_minutes int,
  planned_minutes int,
  generated_by record_source not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text,
  priorities jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,       -- detected overload / conflicts
  recommended_moves jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.life_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '90-day plan',
  vision text,
  start_date date not null,
  end_date date not null,
  status goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.life_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_plan_id uuid not null references public.life_plans(id) on delete cascade,
  horizon plan_horizon not null,
  position int not null,                          -- month 1..3, week 1..13
  title text not null,
  description text,
  objectives jsonb not null default '[]'::jsonb,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------- reflections ----
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  kind reflection_kind not null default 'daily_reset',
  raw_text text,
  mood smallint check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  wins jsonb not null default '[]'::jsonb,
  obstacles jsonb not null default '[]'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- the AI ----
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  kind conversation_kind not null default 'general',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role message_role not null,
  content text not null default '',
  -- Executed tool calls, each {tool, status, summary, entity_id}. The UI renders these
  -- as receipts, so a claimed action always maps to a stored result.
  actions jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create table public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind memory_kind not null default 'fact',
  key text not null,
  value text not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  is_active boolean not null default true,
  source_conversation_id uuid references public.ai_conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- Daily counter used to enforce the free-tier conversation limit server side.
create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  message_count int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  primary key (user_id, date)
);

-- ------------------------------------------------- notifications & data ----
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                             -- morning_brief | task | habit | overload | reset
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  local_identifier text,                          -- expo-notifications id, for cancelling
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  props jsonb not null default '{}'::jsonb,       -- never contains user content
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- indexes ----
create index on public.life_areas (user_id, sort_order);
create index on public.goals (user_id, status, target_date);
create index on public.goal_milestones (user_id, goal_id, sort_order);
create index on public.projects (user_id, status);
create index on public.project_milestones (user_id, project_id, sort_order);
create index on public.habits (user_id, is_active);
create index on public.habit_logs (user_id, habit_id, date desc);
create index on public.tasks (user_id, scheduled_date, order_index);
create index on public.tasks (user_id, status, scheduled_date);
create index on public.tasks (user_id, goal_id);
create index on public.tasks (user_id, project_id);
create index on public.calendar_events (user_id, starts_at);
create index on public.daily_plans (user_id, date desc);
create index on public.weekly_plans (user_id, week_start desc);
create index on public.life_plan_items (user_id, life_plan_id, horizon, position);
create index on public.reflections (user_id, date desc);
create index on public.ai_conversations (user_id, updated_at desc);
create index on public.ai_messages (user_id, conversation_id, created_at);
create index on public.ai_memory (user_id, is_active, importance desc);
create index on public.notifications (user_id, scheduled_for);
create index on public.analytics_events (user_id, created_at desc);
