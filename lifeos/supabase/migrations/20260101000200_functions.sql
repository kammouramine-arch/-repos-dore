-- ============================================================================
-- Triggers, derived progress, and the RPCs the app calls.
-- ============================================================================

-- ------------------------------------------------------------ updated_at ---
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_preferences','subscriptions','life_areas','goals','projects',
    'habits','tasks','calendar_events','daily_plans','weekly_plans','life_plans',
    'ai_conversations','ai_memory'
  ]
  loop
    execute format(
      'create trigger touch_%1$s before update on public.%1$I
         for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- --------------------------------------------------------- new user setup ---
-- A fresh account gets a profile, preferences, a free subscription and the
-- default life areas, so the app never has to special-case an empty account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------- derived progress ---
-- A goal's progress is milestone completion when milestones exist; otherwise it
-- is the completion rate of its linked tasks. Keeps the number honest.
create or replace function public.recalc_goal_progress(p_goal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  total int; done int; pct int;
begin
  select count(*), count(*) filter (where is_done) into total, done
  from public.goal_milestones where goal_id = p_goal_id;

  if total = 0 then
    select count(*), count(*) filter (where status = 'done') into total, done
    from public.tasks where goal_id = p_goal_id;
  end if;

  pct := case when total = 0 then 0 else round((done::numeric / total) * 100) end;
  update public.goals set progress = pct where id = p_goal_id;
end $$;

create or replace function public.recalc_project_progress(p_project_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  total int; done int; pct int;
begin
  select count(*), count(*) filter (where is_done) into total, done
  from public.project_milestones where project_id = p_project_id;

  if total = 0 then
    select count(*), count(*) filter (where status = 'done') into total, done
    from public.tasks where project_id = p_project_id;
  end if;

  pct := case when total = 0 then 0 else round((done::numeric / total) * 100) end;
  update public.projects set progress = pct where id = p_project_id;
end $$;

create or replace function public.on_goal_milestone_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_goal_progress(coalesce(new.goal_id, old.goal_id));
  return coalesce(new, old);
end $$;

create or replace function public.on_project_milestone_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_project_progress(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end $$;

create or replace function public.on_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create or replace function public.after_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.goal_id, old.goal_id) is not null then
    perform public.recalc_goal_progress(coalesce(new.goal_id, old.goal_id));
  end if;
  if coalesce(new.project_id, old.project_id) is not null then
    perform public.recalc_project_progress(coalesce(new.project_id, old.project_id));
  end if;
  return coalesce(new, old);
end $$;

create trigger goal_milestone_progress
  after insert or update or delete on public.goal_milestones
  for each row execute function public.on_goal_milestone_change();

create trigger project_milestone_progress
  after insert or update or delete on public.project_milestones
  for each row execute function public.on_project_milestone_change();

create trigger task_completed_at
  before update on public.tasks
  for each row execute function public.on_task_change();

create trigger task_rollup
  after insert or update or delete on public.tasks
  for each row execute function public.after_task_change();

-- Completing a goal stamps the time; reopening clears it.
create or replace function public.on_goal_status_change()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
    new.progress := 100;
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger goal_completed_at before update on public.goals
  for each row execute function public.on_goal_status_change();

-- ------------------------------------------------------------ life score ---
-- Per-area progress blends goal progress, habit consistency (last 14 days) and
-- task completion (last 14 days). Only areas with something in them are scored.
create or replace function public.get_life_progress()
returns table (
  life_area_id uuid,
  area_key life_area_key,
  name text,
  goal_progress numeric,
  habit_consistency numeric,
  task_completion numeric,
  score numeric,
  goal_count int,
  habit_count int
)
-- Definer, with every query filtered by auth.uid() below: the function is the
-- boundary, so it does not depend on the caller having rights on the auth schema.
language sql stable security definer set search_path = public, auth as $$
  with areas as (
    select a.id, a.key, a.name from public.life_areas a
    where a.user_id = auth.uid() and a.is_active
  ),
  g as (
    select life_area_id, avg(progress)::numeric as p, count(*)::int as n
    from public.goals
    where user_id = auth.uid() and status = 'active' and life_area_id is not null
    group by life_area_id
  ),
  h as (
    select hb.life_area_id,
           count(*)::int as n,
           coalesce(
             sum(case when hl.status = 'done' then 1 else 0 end)::numeric
             / nullif(sum(hb.target_per_week * 2.0), 0) * 100, 0) as consistency
    from public.habits hb
    left join public.habit_logs hl
      on hl.habit_id = hb.id and hl.date >= current_date - interval '14 days'
    where hb.user_id = auth.uid() and hb.is_active and hb.life_area_id is not null
    group by hb.life_area_id
  ),
  t as (
    select life_area_id,
           count(*) filter (where status = 'done')::numeric / nullif(count(*), 0) * 100 as pct
    from public.tasks
    where user_id = auth.uid()
      and scheduled_date between current_date - interval '14 days' and current_date
      and life_area_id is not null
    group by life_area_id
  )
  select a.id, a.key, a.name,
         round(coalesce(g.p, 0), 1),
         round(least(coalesce(h.consistency, 0), 100), 1),
         round(coalesce(t.pct, 0), 1),
         round(
           ( coalesce(g.p, 0) * case when g.n is null then 0 else 0.5 end
           + least(coalesce(h.consistency, 0), 100) * case when h.n is null then 0 else 0.3 end
           + coalesce(t.pct, 0) * case when t.pct is null then 0 else 0.2 end )
           / nullif(
               ( case when g.n is null then 0 else 0.5 end
               + case when h.n is null then 0 else 0.3 end
               + case when t.pct is null then 0 else 0.2 end ), 0)
         , 1),
         coalesce(g.n, 0), coalesce(h.n, 0)
  from areas a
  left join g on g.life_area_id = a.id
  left join h on h.life_area_id = a.id
  left join t on t.life_area_id = a.id
  order by a.name;
$$;

-- Streak = consecutive days ending today (or yesterday) with a 'done' log.
create or replace function public.get_habit_streak(p_habit_id uuid)
returns int language plpgsql stable security definer set search_path = public, auth as $$
declare
  streak int := 0;
  cursor_date date := current_date;
  has_today boolean;
begin
  select exists (
    select 1 from public.habit_logs
    where habit_id = p_habit_id and user_id = auth.uid()
      and date = current_date and status = 'done'
  ) into has_today;

  if not has_today then cursor_date := current_date - 1; end if;

  loop
    exit when not exists (
      select 1 from public.habit_logs
      where habit_id = p_habit_id and user_id = auth.uid()
        and date = cursor_date and status = 'done'
    );
    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end $$;

-- --------------------------------------------------------- privacy tools ---
-- Full export of everything we hold about the caller.
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile',        (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'preferences',    (select to_jsonb(x) from public.user_preferences x where x.user_id = auth.uid()),
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
    'conversations',  coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_conversations x where x.user_id = auth.uid()), '[]'::jsonb),
    'messages',       coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_messages x where x.user_id = auth.uid()), '[]'::jsonb),
    'memory',         coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_memory x where x.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- Deletes the auth user; every table cascades from it.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = uid;
end $$;

-- Wipes conversations and memory without deleting the account.
create or replace function public.forget_everything()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from public.ai_messages where user_id = auth.uid();
  delete from public.ai_conversations where user_id = auth.uid();
  delete from public.ai_memory where user_id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.forget_everything() to authenticated;
grant execute on function public.get_life_progress() to authenticated;
grant execute on function public.get_habit_streak(uuid) to authenticated;

-- Server-owned usage counter used to enforce the free-tier conversation limit.
create or replace function public.increment_ai_usage(
  p_user uuid, p_date date, p_input int default 0, p_output int default 0
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.ai_usage (user_id, date, message_count, input_tokens, output_tokens)
  values (p_user, p_date, 1, coalesce(p_input, 0), coalesce(p_output, 0))
  on conflict (user_id, date) do update
    set message_count = public.ai_usage.message_count + 1,
        input_tokens  = public.ai_usage.input_tokens + coalesce(p_input, 0),
        output_tokens = public.ai_usage.output_tokens + coalesce(p_output, 0);
end $$;

revoke all on function public.increment_ai_usage(uuid, date, int, int) from public;
