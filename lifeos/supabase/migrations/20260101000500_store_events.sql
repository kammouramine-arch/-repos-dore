-- ============================================================================
-- Store event ledger and rate limiting.
--
-- Every purchase verification and every store notification is recorded here with
-- the store's own identifier, so a replayed webhook or a re-sent receipt updates
-- the same row instead of creating a second entitlement.
-- ============================================================================

create table public.store_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('apple', 'google')),
  -- The store's identifier for this event: Apple's notificationUUID or transactionId,
  -- Google's messageId or purchaseToken+eventTime. Unique per provider.
  event_id text not null,
  kind text not null,
  user_id uuid references auth.users(id) on delete set null,
  original_transaction_id text,
  product_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'processed' check (status in ('processed', 'ignored', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index on public.store_events (original_transaction_id, created_at desc);
create index on public.store_events (user_id, created_at desc);

alter table public.store_events enable row level security;
alter table public.store_events force row level security;

-- Written only by the service role in the verification and notification functions.
-- A user may read their own history; nobody may write from a device.
create policy "own store events" on public.store_events
  for select using (auth.uid() = user_id);

/*
  A cheap per-user, per-action rate limit for the edge functions. This is abuse
  protection in front of the usage meter, not a replacement for it: it stops a client
  hammering an endpoint even when it has allowance left.
*/
create table public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, action, window_start)
);

alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;

create or replace function public.check_rate_limit(
  p_user uuid,
  p_action text,
  p_limit int,
  p_window_seconds int
) returns table (allowed boolean, retry_after_seconds int)
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits (user_id, action, window_start, count)
  values (p_user, p_action, v_window, 1)
  on conflict (user_id, action, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Keep the table small; old windows are of no interest.
  delete from public.rate_limits
   where user_id = p_user and window_start < now() - make_interval(secs => p_window_seconds * 4);

  if v_count > p_limit then
    return query select false,
      greatest(1, p_window_seconds - floor(extract(epoch from now() - v_window))::int);
    -- Stop here: falling through would append a contradictory "allowed" row.
    return;
  end if;

  return query select true, 0;
end $$;

revoke all on function public.check_rate_limit(uuid, text, int, int) from public;

/*
  Applies a verified store subscription to an account, idempotently.

  The event id is recorded first; a replay hits the unique constraint, is reported as
  a duplicate, and changes nothing. Entitlement is only ever written here or by the
  same path in the verification function — never from a device.
*/
create or replace function public.apply_store_subscription(
  p_provider text,
  p_event_id text,
  p_kind text,
  p_user uuid,
  p_tier text,
  p_status text,
  p_product_id text,
  p_original_transaction_id text,
  p_transaction_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_trial_ends_at timestamptz,
  p_grace_until timestamptz,
  p_will_renew boolean,
  p_payload jsonb default '{}'::jsonb
) returns table (applied boolean, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare
  -- GET DIAGNOSTICS yields an integer row count; keeping the type honest avoids
  -- relying on an implicit cast.
  v_inserted int := 0;
begin
  insert into public.store_events (
    provider, event_id, kind, user_id, original_transaction_id, product_id, payload
  )
  values (
    p_provider, p_event_id, p_kind, p_user, p_original_transaction_id, p_product_id, p_payload
  )
  on conflict (provider, event_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    -- Already handled: a duplicate notification or a re-sent receipt. Returning here
    -- is what makes this idempotent — without it a replayed event would fall through
    -- and rewrite the subscription, which can downgrade a paying account.
    return query select false, true;
    return;
  end if;

  update public.subscriptions
     set tier = p_tier,
         status = p_status,
         platform = p_provider,
         provider = p_provider,
         product_id = p_product_id,
         current_period_start = p_period_start,
         current_period_end = p_period_end,
         trial_ends_at = p_trial_ends_at,
         grace_until = p_grace_until,
         canceled_at = case when p_status = 'canceled' then now() else null end,
         will_renew = coalesce(p_will_renew, false),
         store_transaction_id = p_transaction_id,
         store_original_transaction_id = p_original_transaction_id,
         last_verified_at = now(),
         updated_at = now()
   where user_id = p_user;

  return query select true, false;
end $$;

revoke all on function public.apply_store_subscription(
  text, text, text, uuid, text, text, text, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz, boolean, jsonb
) from public;

/* Finds the account a store subscription already belongs to. */
create or replace function public.user_for_original_transaction(p_original_transaction_id text)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.subscriptions
   where store_original_transaction_id = p_original_transaction_id
   limit 1;
$$;

revoke all on function public.user_for_original_transaction(text) from public;
