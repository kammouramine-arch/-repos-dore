-- ============================================================================
-- Tiered subscriptions, metered AI usage, and remotely configurable pricing.
--
-- Tiers and statuses are text with a check constraint rather than enums, so a new
-- plan (or a pricing experiment) never needs a schema migration.
-- ============================================================================

-- ------------------------------------------------------- runtime configuration --
-- Overrides merged on top of the compiled catalogue in _shared/plans.ts. Prices,
-- quotas, entitlements and model routing can all be changed here without a release.
create table public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  -- Public rows are readable by any signed-in user (plans, pricing). Anything
  -- operational stays private to the service role.
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
alter table public.app_config force row level security;

create policy "public config is readable" on public.app_config
  for select using (is_public);

insert into public.app_config (key, value, is_public)
values ('plans', '{}'::jsonb, true)
on conflict (key) do nothing;

create trigger touch_app_config before update on public.app_config
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- subscriptions --
alter table public.subscriptions
  alter column tier drop default,
  alter column tier type text using tier::text,
  alter column tier set default 'free';

alter table public.subscriptions
  add constraint subscriptions_tier_check
  check (tier in ('free', 'plus', 'pro', 'ultra'));

alter table public.subscriptions
  alter column status set default 'free';

update public.subscriptions set status = 'free' where tier = 'free';

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('free', 'trialing', 'active', 'grace_period', 'canceled', 'expired'));

alter table public.subscriptions
  add column if not exists current_period_start timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists grace_until timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists will_renew boolean not null default false,
  add column if not exists provider text not null default 'none',
  add column if not exists store_transaction_id text,
  add column if not exists store_original_transaction_id text,
  add column if not exists last_verified_at timestamptz;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('none', 'apple', 'google', 'promo'));

-- One store transaction belongs to one account.
create unique index if not exists subscriptions_original_transaction_idx
  on public.subscriptions (store_original_transaction_id)
  where store_original_transaction_id is not null;

-- The old daily counter is replaced by period-based metering below.
drop function if exists public.increment_ai_usage(uuid, date, int, int);
drop table if exists public.ai_usage;

-- ---------------------------------------------------------------- metering --
-- One row per user, period and meter. Written only by the edge functions through
-- consume_usage(), so a device cannot reset its own allowance.
create table public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  meter text not null,
  used numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start, meter),
  constraint usage_counters_meter_check check (meter in (
    'ai_requests', 'advanced_requests', 'voice_seconds', 'life_resets',
    'planning_requests', 'memory_items', 'agent_runs'
  ))
);

-- The ledger behind the counters: what was spent, on what, and when.
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  meter text not null,
  amount numeric not null,
  operation text not null,
  tier text,
  model text,
  created_at timestamptz not null default now()
);

create index on public.usage_events (user_id, created_at desc);
create index on public.usage_counters (user_id, period_start);

alter table public.usage_counters enable row level security;
alter table public.usage_counters force row level security;
alter table public.usage_events enable row level security;
alter table public.usage_events force row level security;

-- Readable by their owner; writable only by the service role (which bypasses RLS).
create policy "own usage counters" on public.usage_counters
  for select using (auth.uid() = user_id);
create policy "own usage events" on public.usage_events
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------- functions --
/*
  Atomically checks an allowance and spends it.

  The limit is supplied by the caller because plan configuration lives in the
  catalogue, not in the database — but the check and the increment happen together
  here, so two concurrent requests cannot both slip past the last unit.
*/
create or replace function public.consume_usage(
  p_user uuid,
  p_period_start date,
  p_meter text,
  p_amount numeric,
  p_limit numeric,
  p_operation text default 'unknown',
  p_tier text default null,
  p_model text default null
) returns table (allowed boolean, used numeric, remaining numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_used numeric;
begin
  insert into public.usage_counters (user_id, period_start, meter, used)
  values (p_user, p_period_start, p_meter, 0)
  on conflict (user_id, period_start, meter) do nothing;

  select uc.used into v_used
  from public.usage_counters uc
  where uc.user_id = p_user and uc.period_start = p_period_start and uc.meter = p_meter
  for update;

  if v_used + p_amount > p_limit then
    return query select false, v_used, greatest(p_limit - v_used, 0);
    return;
  end if;

  update public.usage_counters uc
     set used = uc.used + p_amount, updated_at = now()
   where uc.user_id = p_user and uc.period_start = p_period_start and uc.meter = p_meter
  returning uc.used into v_used;

  insert into public.usage_events (user_id, period_start, meter, amount, operation, tier, model)
  values (p_user, p_period_start, p_meter, p_amount, p_operation, p_tier, p_model);

  return query select true, v_used, greatest(p_limit - v_used, 0);
end $$;

/* Releases usage when an operation failed after being charged. */
create or replace function public.refund_usage(
  p_user uuid,
  p_period_start date,
  p_meter text,
  p_amount numeric
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.usage_counters
     set used = greatest(used - p_amount, 0), updated_at = now()
   where user_id = p_user and period_start = p_period_start and meter = p_meter;
end $$;

/* What the user has spent this period — the numbers behind the usage screen. */
create or replace function public.get_usage_summary(p_period_start date)
returns table (meter text, used numeric)
language sql stable security invoker as $$
  select uc.meter, uc.used
  from public.usage_counters uc
  where uc.user_id = auth.uid() and uc.period_start = p_period_start;
$$;

revoke all on function public.consume_usage(uuid, date, text, numeric, numeric, text, text, text) from public;
revoke all on function public.refund_usage(uuid, date, text, numeric) from public;
grant execute on function public.get_usage_summary(date) to authenticated;

-- New accounts start on Free with no store relationship.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;

  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'free')
  on conflict do nothing;

  insert into public.life_areas (user_id, key, name, sort_order)
  values
    (new.id, 'health',        'Health',          0),
    (new.id, 'career',        'Career',          1),
    (new.id, 'money',         'Money',           2),
    (new.id, 'relationships', 'Relationships',   3),
    (new.id, 'growth',        'Personal growth', 4)
  on conflict (user_id, key) do nothing;

  return new;
end $$;
