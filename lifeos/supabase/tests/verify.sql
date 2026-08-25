-- ============================================================================
-- LifeOS — database verification
--
-- Runs the assertions that only a live database can answer: that the migrations
-- executed, that the functions behave, and above all that one user cannot reach
-- another user's data.
--
-- Safe to run against a real project: it creates two throwaway users, asserts, and
-- deletes them again. It touches no other account's rows.
--
-- Where to run it
--   Supabase dashboard → SQL Editor → paste → Run.   (no terminal needed)
--   or:  psql "$DATABASE_URL" -f supabase/tests/verify.sql
--
-- Every check raises an exception on failure, so a green run means green.
-- ============================================================================

do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';
  b uuid := '00000000-0000-4000-8000-00000000000b';
  v_count int;
  v_text text;
  v_bool boolean;
  v_row record;
  failures int := 0;

  procedure_note text;
begin
  -- ── clean slate ───────────────────────────────────────────────────────────
  delete from auth.users where id in (a, b);

  insert into auth.users (id, email, raw_user_meta_data)
  values (a, 'verify-a@lifeos.test', '{"full_name":"Verify A"}'::jsonb),
         (b, 'verify-b@lifeos.test', '{"full_name":"Verify B"}'::jsonb);

  -- ── 1. new accounts are provisioned by the trigger ────────────────────────
  select count(*) into v_count from public.profiles where id in (a, b);
  if v_count <> 2 then raise exception 'FAIL 1a: profiles not created (got %)', v_count; end if;

  select count(*) into v_count from public.user_preferences where user_id in (a, b);
  if v_count <> 2 then raise exception 'FAIL 1b: preferences not created (got %)', v_count; end if;

  select count(*) into v_count from public.subscriptions where user_id in (a, b) and tier = 'free';
  if v_count <> 2 then raise exception 'FAIL 1c: free subscriptions not created (got %)', v_count; end if;

  select count(*) into v_count from public.life_areas where user_id = a;
  if v_count < 5 then raise exception 'FAIL 1d: default life areas missing (got %)', v_count; end if;

  -- ── 2. metering is atomic and refuses past the limit ──────────────────────
  delete from public.usage_counters where user_id = a;

  select allowed into v_bool from public.consume_usage(a, current_date, 'ai_requests', 1, 2, 'chat');
  if not v_bool then raise exception 'FAIL 2a: first request refused'; end if;

  select allowed into v_bool from public.consume_usage(a, current_date, 'ai_requests', 1, 2, 'chat');
  if not v_bool then raise exception 'FAIL 2b: second request refused'; end if;

  select allowed into v_bool from public.consume_usage(a, current_date, 'ai_requests', 1, 2, 'chat');
  if v_bool then raise exception 'FAIL 2c: third request allowed past a limit of 2'; end if;

  select count(*) into v_count from public.consume_usage(a, current_date, 'ai_requests', 1, 2, 'chat');
  if v_count <> 1 then raise exception 'FAIL 2d: consume_usage returned % rows, expected 1', v_count; end if;

  perform public.refund_usage(a, current_date, 'ai_requests', 1);
  select used into v_count from public.usage_counters
   where user_id = a and meter = 'ai_requests' and period_start = current_date;
  if v_count <> 1 then raise exception 'FAIL 2e: refund did not restore allowance (used = %)', v_count; end if;

  -- A refund can never drive a counter below zero.
  perform public.refund_usage(a, current_date, 'ai_requests', 999);
  select used into v_count from public.usage_counters
   where user_id = a and meter = 'ai_requests' and period_start = current_date;
  if v_count <> 0 then raise exception 'FAIL 2f: counter went negative (used = %)', v_count; end if;

  -- ── 3. rate limiting ──────────────────────────────────────────────────────
  delete from public.rate_limits where user_id = a;

  select allowed into v_bool from public.check_rate_limit(a, 'verify', 1, 60);
  if not v_bool then raise exception 'FAIL 3a: first call rate limited'; end if;

  select count(*) into v_count from public.check_rate_limit(a, 'verify', 1, 60);
  if v_count <> 1 then raise exception 'FAIL 3b: check_rate_limit returned % rows, expected 1', v_count; end if;

  select allowed into v_bool from public.check_rate_limit(a, 'verify', 1, 60);
  if v_bool then raise exception 'FAIL 3c: rate limit not enforced'; end if;

  -- ── 4. store entitlement is idempotent ────────────────────────────────────
  delete from public.store_events where event_id like 'verify:%';

  select applied, duplicate into v_row
    from public.apply_store_subscription(
      'apple', 'verify:evt', 'active', a, 'ultra', 'active', 'lifeos.ultra.monthly',
      'verify-orig', 'verify-txn', now(), now() + interval '30 days', null, null, true);
  if not v_row.applied then raise exception 'FAIL 4a: first store event not applied'; end if;

  select tier into v_text from public.subscriptions where user_id = a;
  if v_text <> 'ultra' then raise exception 'FAIL 4b: tier not granted (got %)', v_text; end if;

  -- Replaying the same event id with a downgrade payload must change nothing.
  select applied, duplicate into v_row
    from public.apply_store_subscription(
      'apple', 'verify:evt', 'expired', a, 'free', 'expired', 'lifeos.plus.monthly',
      'verify-orig', 'verify-txn', now(), now(), null, null, false);
  if v_row.applied then raise exception 'FAIL 4c: replayed event was applied again'; end if;
  if not v_row.duplicate then raise exception 'FAIL 4d: replay not reported as duplicate'; end if;

  select tier into v_text from public.subscriptions where user_id = a;
  if v_text <> 'ultra' then
    raise exception 'FAIL 4e: a replayed event changed entitlement to % — idempotency is broken', v_text;
  end if;

  select count(*) into v_count
    from public.apply_store_subscription(
      'apple', 'verify:evt', 'expired', a, 'free', 'expired', 'lifeos.plus.monthly',
      'verify-orig', 'verify-txn', now(), now(), null, null, false);
  if v_count <> 1 then raise exception 'FAIL 4f: apply_store_subscription returned % rows', v_count; end if;

  -- ── 5. a store subscription belongs to one account ────────────────────────
  select public.user_for_original_transaction('verify-orig') into v_text;
  if v_text::uuid <> a then raise exception 'FAIL 5: transaction not linked to its owner'; end if;

  raise notice 'Checks 1-5 passed (provisioning, metering, rate limiting, billing idempotency).';
end $$;

-- ── 6. row level security, as two real users ────────────────────────────────
-- Done outside the DO block so the role and JWT claim can be set per transaction.

begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-00000000000a';

  insert into public.goals (title) values ('Verify A private goal');
  insert into public.tasks (title) values ('Verify A private task');
  insert into public.ai_memory (kind, key, value) values ('fact', 'verify_secret', 'A private memory');

  do $$
  declare v_count int;
  begin
    select count(*) into v_count from public.goals where title = 'Verify A private goal';
    if v_count <> 1 then raise exception 'FAIL 6a: a user cannot see their own goal'; end if;
  end $$;
commit;

begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-00000000000b';

  do $$
  declare v_count int; v_tier text;
  begin
    select count(*) into v_count from public.goals where title = 'Verify A private goal';
    if v_count <> 0 then raise exception 'FAIL 6b: user B can READ user A''s goals'; end if;

    select count(*) into v_count from public.tasks where title = 'Verify A private task';
    if v_count <> 0 then raise exception 'FAIL 6c: user B can READ user A''s tasks'; end if;

    select count(*) into v_count from public.ai_memory where key = 'verify_secret';
    if v_count <> 0 then raise exception 'FAIL 6d: user B can READ user A''s memories'; end if;

    select count(*) into v_count from public.profiles;
    if v_count <> 1 then raise exception 'FAIL 6e: user B sees % profiles, expected only their own', v_count; end if;

    -- Writes against another user's rows must affect nothing.
    update public.goals set title = 'hijacked';
    select count(*) into v_count from public.goals where title = 'hijacked';
    if v_count <> 0 then raise exception 'FAIL 6f: user B can WRITE user A''s goals'; end if;

    delete from public.tasks;

    -- And a device must not be able to promote itself to a paid plan.
    update public.subscriptions set tier = 'ultra', status = 'active';
    select tier into v_tier from public.subscriptions;
    if v_tier <> 'free' then raise exception 'FAIL 6g: a user promoted themselves to %', v_tier; end if;

    select count(*) into v_count from public.usage_counters;
    if v_count <> 0 then raise exception 'FAIL 6h: user B can read another user''s usage'; end if;
  end $$;
commit;

begin;
  set local role anon;
  do $$
  declare v_count int;
  begin
    select count(*) into v_count from public.goals;
    if v_count <> 0 then raise exception 'FAIL 6i: a signed-out visitor can read goals'; end if;

    select count(*) into v_count from public.profiles;
    if v_count <> 0 then raise exception 'FAIL 6j: a signed-out visitor can read profiles'; end if;
  end $$;
commit;

-- ── 7. the owner's data survived all of that, and the RPCs work ─────────────
begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-00000000000a';

  do $$
  declare v_count int; v_progress int; v_streak int;
  begin
    select count(*) into v_count from public.goals where title = 'Verify A private goal';
    if v_count <> 1 then raise exception 'FAIL 7a: user A lost their goal to user B''s writes'; end if;

    select count(*) into v_count from public.tasks where title = 'Verify A private task';
    if v_count <> 1 then raise exception 'FAIL 7b: user A lost their task to user B''s delete'; end if;

    -- Derived progress: one milestone of two done is 50%.
    insert into public.goal_milestones (goal_id, title, is_done)
      select id, 'done milestone', true from public.goals where title = 'Verify A private goal';
    insert into public.goal_milestones (goal_id, title, is_done)
      select id, 'open milestone', false from public.goals where title = 'Verify A private goal';

    select progress into v_progress from public.goals where title = 'Verify A private goal';
    if v_progress <> 50 then raise exception 'FAIL 7c: goal progress is %, expected 50', v_progress; end if;

    -- Completing a task stamps completed_at.
    update public.tasks set status = 'done' where title = 'Verify A private task';
    select count(*) into v_count from public.tasks
     where title = 'Verify A private task' and completed_at is not null;
    if v_count <> 1 then raise exception 'FAIL 7d: completing a task did not stamp completed_at'; end if;

    -- Habit streak counts back from today.
    insert into public.habits (title, target_per_week) values ('Verify habit', 3);
    insert into public.habit_logs (habit_id, date, status)
      select id, current_date, 'done' from public.habits where title = 'Verify habit';
    insert into public.habit_logs (habit_id, date, status)
      select id, current_date - 1, 'done' from public.habits where title = 'Verify habit';

    select public.get_habit_streak((select id from public.habits where title = 'Verify habit'))
      into v_streak;
    if v_streak <> 2 then raise exception 'FAIL 7e: habit streak is %, expected 2', v_streak; end if;

    -- The reporting RPCs are callable by an ordinary signed-in user.
    perform public.get_life_progress();
    perform public.get_usage_summary(current_date);

    select count(*) into v_count from jsonb_object_keys(public.export_my_data()) k;
    if v_count < 15 then raise exception 'FAIL 7f: export returned only % sections', v_count; end if;

    -- Forgetting removes conversations and memory but never the plan.
    insert into public.ai_conversations (kind) values ('general');
    perform public.forget_everything();

    select count(*) into v_count from public.ai_memory;
    if v_count <> 0 then raise exception 'FAIL 7g: forget_everything left memories behind'; end if;

    select count(*) into v_count from public.goals where title = 'Verify A private goal';
    if v_count <> 1 then raise exception 'FAIL 7h: forget_everything deleted the user''s goals'; end if;
  end $$;
commit;

-- ── 8. deleting an account removes everything it owned ──────────────────────
begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-00000000000a';
  select public.delete_my_account();
commit;

do $$
declare v_count int;
begin
  select count(*) into v_count from auth.users where id = '00000000-0000-4000-8000-00000000000a';
  if v_count <> 0 then raise exception 'FAIL 8a: the account was not deleted'; end if;

  select count(*) into v_count from public.goals where user_id = '00000000-0000-4000-8000-00000000000a';
  if v_count <> 0 then raise exception 'FAIL 8b: the account''s goals did not cascade away'; end if;

  -- Tidy up the second throwaway account.
  delete from auth.users where id = '00000000-0000-4000-8000-00000000000b';
  delete from public.store_events where event_id like 'verify:%';

  raise notice 'Checks 6-8 passed (user isolation, derived data, privacy, deletion).';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. AI router: monetary budgets are atomic, settle once, and cannot double-charge.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';
  p date := date_trunc('month', now())::date;
  v_allowed boolean;
  v_remaining numeric;
  v_reason text;
  v_settled boolean;
  v_spent numeric;
begin
  delete from auth.users where id = a;
  insert into auth.users (id, email) values (a, 'verify.router@lifeos.test');

  -- 9a: a reservation inside the ceiling is allowed.
  select allowed, remaining into v_allowed, v_remaining
    from public.reserve_ai_budget(a, p, 'verify:r1', 0.08, 0.10);
  if not v_allowed then
    raise exception 'FAIL 9a: a $0.08 reservation against a $0.10 ceiling was refused';
  end if;

  -- 9b: a second reservation that would breach the ceiling is refused.
  select allowed, reason into v_allowed, v_reason
    from public.reserve_ai_budget(a, p, 'verify:r2', 0.08, 0.10);
  if v_allowed then
    raise exception 'FAIL 9b: two $0.08 reservations both fit inside a $0.10 ceiling';
  end if;
  if v_reason is distinct from 'budget_exceeded' then
    raise exception 'FAIL 9b: refusal reason was %, expected budget_exceeded', v_reason;
  end if;

  -- 9c: settling for less than reserved returns the difference to the budget.
  select settled, total_spent into v_settled, v_spent
    from public.settle_ai_budget(a, p, 'verify:r1', 0.05);
  if not v_settled then raise exception 'FAIL 9c: settlement did not apply'; end if;
  if v_spent <> 0.05 then raise exception 'FAIL 9c: spent is %, expected 0.05', v_spent; end if;
  if (select reserved from public.ai_budgets where user_id = a and period_start = p) <> 0 then
    raise exception 'FAIL 9c: the unused reservation was not released';
  end if;

  -- 9d: replaying a settlement must not charge twice.
  select settled, total_spent into v_settled, v_spent
    from public.settle_ai_budget(a, p, 'verify:r1', 0.05);
  if v_settled then raise exception 'FAIL 9d: a replayed settlement applied again'; end if;
  if v_spent <> 0.05 then
    raise exception 'FAIL 9d: a replay changed spend to % - settlement is not idempotent', v_spent;
  end if;

  -- 9e: the freed budget is usable again.
  select allowed into v_allowed from public.reserve_ai_budget(a, p, 'verify:r3', 0.04, 0.10);
  if not v_allowed then
    raise exception 'FAIL 9e: $0.04 was refused with only $0.05 of a $0.10 ceiling spent';
  end if;

  -- 9f: a failed call settles at zero and releases its hold without charging.
  select settled into v_settled from public.settle_ai_budget(a, p, 'verify:r3', 0);
  if not v_settled then raise exception 'FAIL 9f: a zero settlement did not release the hold'; end if;
  if (select spent from public.ai_budgets where user_id = a and period_start = p) <> 0.05 then
    raise exception 'FAIL 9f: a failed call changed the settled spend';
  end if;

  delete from auth.users where id = a;

  raise notice 'Check 9 passed: AI budget reservation, settlement and idempotency.';
  raise notice 'LifeOS database verification: ALL CHECKS PASSED.';
end $$;
