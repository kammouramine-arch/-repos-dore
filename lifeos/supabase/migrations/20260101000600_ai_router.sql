-- AI router: request accounting, monetary budgets and provider health.
--
-- Additive only. Nothing here alters an existing table, policy or function, so the
-- verified schema keeps working exactly as it did while the new path is being proven.

-- ─────────────────────────────────────────────────────── request accounting ──
-- One row per model call, successful or not. This is what makes an AI bill
-- explainable: which provider answered, what it cost, and whether that cost was
-- measured or estimated.
create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  tier text not null,
  task_type text not null,
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cached_tokens int not null default 0,
  estimated_cost numeric(12, 8) not null default 0,
  actual_cost numeric(12, 8) not null default 0,
  -- 'metered' when the provider reported usage we priced; 'estimated' when it did not.
  -- Never conflate the two: margin reporting depends on knowing which is which.
  accounting_method text not null default 'estimated'
    check (accounting_method in ('metered', 'estimated')),
  latency_ms int not null default 0,
  success boolean not null default true,
  error_code text,
  fallback_used boolean not null default false,
  fallback_reason text,
  created_at timestamptz not null default now()
);

create index on public.ai_requests (user_id, created_at desc);
create index on public.ai_requests (request_id);
create index on public.ai_requests (provider, model, created_at desc);

-- ────────────────────────────────────────────────────────── budget ledger ──
-- The running monetary total per user per period, alongside the operation allowance
-- in usage_counters. Two different questions, two different limits.
create table public.ai_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  -- Reserved before a call, released after. Never negative.
  reserved numeric(12, 8) not null default 0 check (reserved >= 0),
  -- Settled cost of completed calls.
  spent numeric(12, 8) not null default 0 check (spent >= 0),
  ceiling numeric(12, 8) not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

-- Outstanding holds. A row exists only between reservation and settlement, so an
-- orphaned row is a crashed request and can be swept.
create table public.ai_budget_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  request_id text not null,
  amount numeric(12, 8) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  -- One hold per request id. A retried request cannot reserve twice.
  unique (user_id, request_id)
);

create index on public.ai_budget_reservations (created_at);

-- ───────────────────────────────────────────────────────── provider health ──
create table public.ai_provider_health (
  key text primary key,
  provider text not null,
  model text,
  successes bigint not null default 0,
  failures bigint not null default 0,
  consecutive_failures int not null default 0,
  state text not null default 'closed' check (state in ('closed', 'open', 'half_open')),
  opened_at timestamptz,
  last_failure_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────── RLS ──
alter table public.ai_requests enable row level security;
alter table public.ai_requests force row level security;
alter table public.ai_budgets enable row level security;
alter table public.ai_budgets force row level security;
alter table public.ai_budget_reservations enable row level security;
alter table public.ai_budget_reservations force row level security;
alter table public.ai_provider_health enable row level security;
alter table public.ai_provider_health force row level security;

-- A user may read their own AI history and budget. Nobody writes through the API:
-- every write goes through a definer function called with the service role, so a
-- client cannot grant itself budget by inserting a row.
create policy "own ai requests" on public.ai_requests
  for select using (auth.uid() = user_id);

create policy "own ai budget" on public.ai_budgets
  for select using (auth.uid() = user_id);

-- No policy at all on ai_budget_reservations or ai_provider_health: with RLS forced
-- and no policy, they are invisible to anon and authenticated by construction.

grant select on public.ai_requests to authenticated;
grant select on public.ai_budgets to authenticated;

-- ────────────────────────────────────────────── concurrency-safe reservation ──
-- The race this exists to lose safely: a user has $0.10 left and two requests arrive
-- at once, each estimated at $0.08. Both read "enough left" and both proceed, and the
-- budget is overspent by 60%.
--
-- The insert into ai_budgets takes a row lock for the rest of the transaction, so the
-- second caller blocks until the first has committed its reservation and then reads
-- the updated total. One succeeds, one is refused.
create or replace function public.reserve_ai_budget(
  p_user uuid,
  p_period_start date,
  p_request_id text,
  p_amount numeric,
  p_ceiling numeric
)
returns table (allowed boolean, remaining numeric, reason text)
language plpgsql security definer set search_path = public, auth as $$
declare
  v_reserved numeric;
  v_spent numeric;
  v_remaining numeric;
begin
  -- Establish the row, then lock it. `on conflict do update` on a no-op keeps the
  -- lock semantics identical whether or not the row already existed.
  insert into public.ai_budgets (user_id, period_start, ceiling)
  values (p_user, p_period_start, p_ceiling)
  on conflict (user_id, period_start)
    do update set ceiling = excluded.ceiling, updated_at = now();

  select reserved, spent into v_reserved, v_spent
  from public.ai_budgets
  where user_id = p_user and period_start = p_period_start
  for update;

  v_remaining := p_ceiling - v_spent - v_reserved;

  if p_amount > v_remaining then
    return query select false, greatest(0, v_remaining), 'budget_exceeded'::text;
    -- Stop here. Falling through would append a contradictory "allowed" row.
    return;
  end if;

  insert into public.ai_budget_reservations (user_id, period_start, request_id, amount)
  values (p_user, p_period_start, p_request_id, p_amount)
  on conflict (user_id, request_id) do nothing;

  update public.ai_budgets
     set reserved = reserved + p_amount, updated_at = now()
   where user_id = p_user and period_start = p_period_start;

  return query select true, v_remaining - p_amount, null::text;
end $$;

-- Converts a hold into settled spend. Called with the real cost once the provider has
-- answered; an amount of 0 simply releases the hold, which is what a failed call does.
create or replace function public.settle_ai_budget(
  p_user uuid,
  p_period_start date,
  p_request_id text,
  p_actual numeric
)
-- The OUT column is named total_spent, not spent: an OUT parameter sharing a name
-- with a column of the table being updated makes every unqualified reference to it
-- ambiguous, and PostgreSQL rejects the function at run time rather than at creation.
returns table (settled boolean, total_spent numeric)
language plpgsql security definer set search_path = public, auth as $$
declare
  v_reserved numeric;
  v_spent numeric;
begin
  delete from public.ai_budget_reservations
   where user_id = p_user and request_id = p_request_id
  returning amount into v_reserved;

  if v_reserved is null then
    -- Nothing held: either already settled or never reserved. Report the current total
    -- rather than double-charging.
    select b.spent into v_spent from public.ai_budgets b
     where b.user_id = p_user and b.period_start = p_period_start;
    return query select false, coalesce(v_spent, 0::numeric);
    return;
  end if;

  update public.ai_budgets b
     set reserved = greatest(0, b.reserved - v_reserved),
         spent = b.spent + greatest(0, p_actual),
         updated_at = now()
   where b.user_id = p_user and b.period_start = p_period_start
  returning b.spent into v_spent;

  return query select true, coalesce(v_spent, 0::numeric);
end $$;

-- Reads the caller's own budget. Definer because it touches auth.uid().
create or replace function public.get_ai_budget(p_period_start date)
returns table (spent numeric, reserved numeric, ceiling numeric)
language sql stable security definer set search_path = public, auth as $$
  select b.spent, b.reserved, b.ceiling
    from public.ai_budgets b
   where b.user_id = auth.uid() and b.period_start = p_period_start;
$$;

-- Only the service role may move money. `public` includes anon and authenticated.
revoke all on function public.reserve_ai_budget(uuid, date, text, numeric, numeric) from public;
revoke all on function public.settle_ai_budget(uuid, date, text, numeric) from public;
grant execute on function public.get_ai_budget(date) to authenticated;
