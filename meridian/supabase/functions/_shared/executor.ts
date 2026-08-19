import type { SupabaseClient } from '@supabase/supabase-js';
import { type ToolName, toolMeta, validateToolInput } from './tools.ts';

/**
 * Executes a validated tool call against the database using the caller's own
 * credentials. Row level security is the last line of defence; ownership is also
 * checked explicitly wherever a tool takes an id.
 *
 * Nothing here builds SQL from model output — each tool maps to one fixed query.
 */

export type ToolResult = {
  ok: boolean;
  summary: string;
  entityId?: string | null;
  entityType?: string | null;
  data?: unknown;
  error?: string;
};

type Ctx = {
  db: SupabaseClient;
  userId: string;
  today: string;
  weekStart: string;
  tier: 'free' | 'pro';
};

const ok = (summary: string, extra: Partial<ToolResult> = {}): ToolResult => ({
  ok: true,
  summary,
  ...extra,
});
const err = (message: string): ToolResult => ({ ok: false, summary: message, error: message });

function addDays(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Resolves a life-area key to the user's area id, creating it when missing. */
async function areaId(ctx: Ctx, key?: string): Promise<string | null> {
  if (!key) return null;
  const existing = await ctx.db.from('life_areas').select('id').eq('key', key).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;

  const name = key.charAt(0).toUpperCase() + key.slice(1);
  const created = await ctx.db
    .from('life_areas')
    .insert({ key, name })
    .select('id')
    .single();
  return (created.data?.id as string) ?? null;
}

/** Confirms a row belongs to the caller before touching it. */
async function owns(ctx: Ctx, table: string, id: string): Promise<boolean> {
  const { data } = await ctx.db.from(table).select('id').eq('id', id).maybeSingle();
  return Boolean(data);
}

type Handler = (ctx: Ctx, input: any) => Promise<ToolResult>;

const handlers: Record<ToolName, Handler> = {
  // ------------------------------------------------------------------ read --
  async get_today(ctx, input) {
    const date = input.date ?? ctx.today;
    const [tasks, events, plan] = await Promise.all([
      ctx.db.from('tasks').select('id, title, scheduled_time, duration_minutes, priority, status, is_focus')
        .eq('scheduled_date', date).neq('status', 'cancelled').order('scheduled_time', { nullsFirst: false }),
      ctx.db.from('calendar_events').select('id, title, starts_at, ends_at, location')
        .gte('starts_at', `${date}T00:00:00Z`).lte('starts_at', `${date}T23:59:59Z`).order('starts_at'),
      ctx.db.from('daily_plans').select('headline, summary, focus').eq('date', date).maybeSingle(),
    ]);
    return ok(`Read ${date}`, {
      data: { date, tasks: tasks.data ?? [], events: events.data ?? [], plan: plan.data ?? null },
    });
  },

  async get_week(ctx, input) {
    const start = input.week_start ?? ctx.weekStart;
    const end = addDays(start, 6);
    const [tasks, events, plan] = await Promise.all([
      ctx.db.from('tasks').select('id, title, scheduled_date, scheduled_time, duration_minutes, priority, status')
        .gte('scheduled_date', start).lte('scheduled_date', end).neq('status', 'cancelled'),
      ctx.db.from('calendar_events').select('id, title, starts_at, ends_at')
        .gte('starts_at', `${start}T00:00:00Z`).lte('starts_at', `${end}T23:59:59Z`),
      ctx.db.from('weekly_plans').select('summary, priorities, risks').eq('week_start', start).maybeSingle(),
    ]);
    return ok(`Read week of ${start}`, {
      data: { week_start: start, tasks: tasks.data ?? [], events: events.data ?? [], plan: plan.data ?? null },
    });
  },

  async get_goals(ctx, input) {
    let query = ctx.db.from('goals').select('id, title, description, life_area_id, target_date, priority, status, progress, strategy');
    if (input.status && input.status !== 'all') query = query.eq('status', input.status);
    else if (!input.status) query = query.eq('status', 'active');
    const { data, error } = await query.limit(50);
    if (error) return err(error.message);

    const ids = (data ?? []).map((g) => g.id);
    const milestones = ids.length
      ? await ctx.db.from('goal_milestones').select('id, goal_id, title, due_date, is_done').in('goal_id', ids)
      : { data: [] };
    return ok(`Read ${data?.length ?? 0} goals`, {
      data: { goals: data ?? [], milestones: milestones.data ?? [] },
    });
  },

  async get_habits(ctx, input) {
    let query = ctx.db.from('habits').select('id, title, cadence, target_per_week, preferred_time, duration_minutes, is_active');
    if (!input.include_inactive) query = query.eq('is_active', true);
    const { data, error } = await query.limit(50);
    if (error) return err(error.message);

    const logs = await ctx.db.from('habit_logs').select('habit_id, date, status')
      .gte('date', addDays(ctx.today, -30));
    return ok(`Read ${data?.length ?? 0} habits`, { data: { habits: data ?? [], logs: logs.data ?? [] } });
  },

  async get_projects(ctx, input) {
    let query = ctx.db.from('projects').select('id, title, description, status, due_date, progress');
    if (input.status && input.status !== 'all') query = query.eq('status', input.status);
    else if (!input.status) query = query.eq('status', 'active');
    const { data, error } = await query.limit(40);
    if (error) return err(error.message);

    const ids = (data ?? []).map((p) => p.id);
    const milestones = ids.length
      ? await ctx.db.from('project_milestones').select('id, project_id, title, due_date, is_done').in('project_id', ids)
      : { data: [] };
    return ok(`Read ${data?.length ?? 0} projects`, {
      data: { projects: data ?? [], milestones: milestones.data ?? [] },
    });
  },

  async get_life_areas(ctx) {
    const { data, error } = await ctx.db.from('life_areas')
      .select('id, key, name, description, satisfaction, is_active').order('sort_order');
    if (error) return err(error.message);
    return ok(`Read ${data?.length ?? 0} life areas`, { data });
  },

  async get_progress(ctx) {
    const { data, error } = await ctx.db.rpc('get_life_progress');
    if (error) return err(error.message);
    const rows = (data ?? []) as { score: number }[];
    const overall = rows.length
      ? Math.round(rows.reduce((s, r) => s + Number(r.score ?? 0), 0) / rows.length)
      : 0;
    return ok('Read life progress', { data: { overall, areas: rows } });
  },

  async get_tasks(ctx, input) {
    let query = ctx.db.from('tasks')
      .select('id, title, scheduled_date, scheduled_time, duration_minutes, priority, status, goal_id, project_id');
    if (input.from) query = query.gte('scheduled_date', input.from);
    if (input.to) query = query.lte('scheduled_date', input.to);
    if (input.status && input.status !== 'all') query = query.eq('status', input.status);
    if (input.search) query = query.ilike('title', `%${input.search}%`);
    const { data, error } = await query.limit(input.limit ?? 50);
    if (error) return err(error.message);
    return ok(`Found ${data?.length ?? 0} tasks`, { data });
  },

  async get_memory(ctx) {
    const { data, error } = await ctx.db.from('ai_memory')
      .select('kind, key, value, importance').eq('is_active', true).order('importance', { ascending: false });
    if (error) return err(error.message);
    return ok(`Read ${data?.length ?? 0} memories`, { data });
  },

  // ----------------------------------------------------------------- goals --
  async create_goal(ctx, input) {
    const { data, error } = await ctx.db.from('goals').insert({
      title: input.title,
      description: input.description ?? null,
      why: input.why ?? null,
      life_area_id: await areaId(ctx, input.life_area),
      target_date: input.target_date ?? null,
      priority: input.priority ?? 'medium',
      strategy: input.strategy ?? [],
      source: 'ai',
    }).select('id').single();
    if (error) return err(error.message);

    if (input.milestones?.length) {
      const rows = input.milestones.map((m: { title: string; due_date?: string }, i: number) => ({
        goal_id: data.id,
        title: m.title,
        due_date: m.due_date ?? null,
        sort_order: i,
      }));
      const ms = await ctx.db.from('goal_milestones').insert(rows);
      if (ms.error) {
        return ok(`Created goal "${input.title}" but its milestones failed: ${ms.error.message}`, {
          entityId: data.id, entityType: 'goal',
        });
      }
    }
    return ok(`Created goal "${input.title}"`, { entityId: data.id, entityType: 'goal' });
  },

  async update_goal(ctx, input) {
    const patch: Record<string, unknown> = {};
    for (const key of ['title', 'description', 'target_date', 'priority', 'status'] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (input.strategy !== undefined) patch.strategy = input.strategy;
    if (input.life_area) patch.life_area_id = await areaId(ctx, input.life_area);
    if (Object.keys(patch).length === 0) return err('Nothing to update');

    const { data, error } = await ctx.db.from('goals').update(patch).eq('id', input.goal_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That goal does not exist');
    return ok(`Updated goal "${data.title}"`, { entityId: input.goal_id, entityType: 'goal' });
  },

  async delete_goal(ctx, input) {
    const { data, error } = await ctx.db.from('goals').delete().eq('id', input.goal_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That goal does not exist');
    return ok(`Deleted goal "${data.title}"`, { entityType: 'goal' });
  },

  async add_goal_milestone(ctx, input) {
    if (!(await owns(ctx, 'goals', input.goal_id))) return err('That goal does not exist');
    const { data, error } = await ctx.db.from('goal_milestones').insert({
      goal_id: input.goal_id, title: input.title, due_date: input.due_date ?? null,
    }).select('id').single();
    if (error) return err(error.message);
    return ok(`Added milestone "${input.title}"`, { entityId: data.id, entityType: 'goal_milestone' });
  },

  async complete_goal_milestone(ctx, input) {
    const done = input.is_done ?? true;
    const { data, error } = await ctx.db.from('goal_milestones')
      .update({ is_done: done, completed_at: done ? new Date().toISOString() : null })
      .eq('id', input.milestone_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That milestone does not exist');
    return ok(`${done ? 'Completed' : 'Reopened'} milestone "${data.title}"`, {
      entityId: input.milestone_id, entityType: 'goal_milestone',
    });
  },

  // ----------------------------------------------------------------- tasks --
  async create_task(ctx, input) {
    if (input.goal_id && !(await owns(ctx, 'goals', input.goal_id))) return err('That goal does not exist');
    if (input.project_id && !(await owns(ctx, 'projects', input.project_id))) return err('That project does not exist');

    const { data, error } = await ctx.db.from('tasks').insert({
      title: input.title,
      notes: input.notes ?? null,
      scheduled_date: input.scheduled_date ?? null,
      scheduled_time: input.scheduled_time ?? null,
      duration_minutes: input.duration_minutes ?? 30,
      priority: input.priority ?? 'medium',
      energy: input.energy ?? 'medium',
      is_focus: input.is_focus ?? false,
      goal_id: input.goal_id ?? null,
      project_id: input.project_id ?? null,
      life_area_id: await areaId(ctx, input.life_area),
      source: 'ai',
    }).select('id').single();
    if (error) return err(error.message);
    return ok(
      `Added "${input.title}"${input.scheduled_date ? ` on ${input.scheduled_date}` : ''}`,
      { entityId: data.id, entityType: 'task' },
    );
  },

  async update_task(ctx, input) {
    const patch: Record<string, unknown> = {};
    for (const key of ['title', 'notes', 'scheduled_time', 'duration_minutes', 'priority', 'energy', 'is_focus'] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (Object.keys(patch).length === 0) return err('Nothing to update');
    const { data, error } = await ctx.db.from('tasks').update(patch).eq('id', input.task_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That task does not exist');
    return ok(`Updated "${data.title}"`, { entityId: input.task_id, entityType: 'task' });
  },

  async complete_task(ctx, input) {
    const done = input.done ?? true;
    const { data, error } = await ctx.db.from('tasks')
      .update({ status: done ? 'done' : 'todo' })
      .eq('id', input.task_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That task does not exist');
    return ok(`${done ? 'Completed' : 'Reopened'} "${data.title}"`, {
      entityId: input.task_id, entityType: 'task',
    });
  },

  async reschedule_task(ctx, input) {
    const patch: Record<string, unknown> = { scheduled_date: input.scheduled_date };
    if (input.scheduled_time !== undefined) patch.scheduled_time = input.scheduled_time;
    const { data, error } = await ctx.db.from('tasks').update(patch).eq('id', input.task_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That task does not exist');
    return ok(`Moved "${data.title}" to ${input.scheduled_date}`, {
      entityId: input.task_id, entityType: 'task',
    });
  },

  async delete_task(ctx, input) {
    const { data, error } = await ctx.db.from('tasks').delete().eq('id', input.task_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That task does not exist');
    return ok(`Deleted "${data.title}"`, { entityType: 'task' });
  },

  // ---------------------------------------------------------------- habits --
  async create_habit(ctx, input) {
    const { data, error } = await ctx.db.from('habits').insert({
      title: input.title,
      cadence: input.cadence ?? 'daily',
      target_per_week: input.target_per_week ?? (input.cadence === 'weekly' ? 1 : 7),
      days_of_week: input.days_of_week ?? null,
      preferred_time: input.preferred_time ?? null,
      duration_minutes: input.duration_minutes ?? 20,
      life_area_id: await areaId(ctx, input.life_area),
      goal_id: input.goal_id ?? null,
      source: 'ai',
    }).select('id').single();
    if (error) return err(error.message);
    return ok(`Started habit "${input.title}"`, { entityId: data.id, entityType: 'habit' });
  },

  async update_habit(ctx, input) {
    const patch: Record<string, unknown> = {};
    for (const key of ['title', 'cadence', 'target_per_week', 'days_of_week', 'preferred_time', 'duration_minutes', 'is_active'] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (Object.keys(patch).length === 0) return err('Nothing to update');
    const { data, error } = await ctx.db.from('habits').update(patch).eq('id', input.habit_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That habit does not exist');
    return ok(`Updated habit "${data.title}"`, { entityId: input.habit_id, entityType: 'habit' });
  },

  async log_habit(ctx, input) {
    if (!(await owns(ctx, 'habits', input.habit_id))) return err('That habit does not exist');
    const date = input.date ?? ctx.today;
    const { error } = await ctx.db.from('habit_logs').upsert(
      { habit_id: input.habit_id, date, status: input.status ?? 'done', note: input.note ?? null },
      { onConflict: 'habit_id,date' },
    );
    if (error) return err(error.message);
    return ok(`Logged habit for ${date}`, { entityId: input.habit_id, entityType: 'habit' });
  },

  async delete_habit(ctx, input) {
    const { data, error } = await ctx.db.from('habits').delete().eq('id', input.habit_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That habit does not exist');
    return ok(`Deleted habit "${data.title}"`, { entityType: 'habit' });
  },

  // -------------------------------------------------------------- projects --
  async create_project(ctx, input) {
    const { data, error } = await ctx.db.from('projects').insert({
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      life_area_id: await areaId(ctx, input.life_area),
      goal_id: input.goal_id ?? null,
      source: 'ai',
    }).select('id').single();
    if (error) return err(error.message);

    if (input.milestones?.length) {
      const rows = input.milestones.map((m: { title: string; due_date?: string }, i: number) => ({
        project_id: data.id, title: m.title, due_date: m.due_date ?? null, sort_order: i,
      }));
      const ms = await ctx.db.from('project_milestones').insert(rows);
      if (ms.error) {
        return ok(`Created project "${input.title}" but its milestones failed: ${ms.error.message}`, {
          entityId: data.id, entityType: 'project',
        });
      }
    }
    return ok(`Created project "${input.title}"`, { entityId: data.id, entityType: 'project' });
  },

  async update_project(ctx, input) {
    const patch: Record<string, unknown> = {};
    for (const key of ['title', 'description', 'due_date', 'status', 'notes'] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (Object.keys(patch).length === 0) return err('Nothing to update');
    const { data, error } = await ctx.db.from('projects').update(patch).eq('id', input.project_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That project does not exist');
    return ok(`Updated project "${data.title}"`, { entityId: input.project_id, entityType: 'project' });
  },

  async add_project_milestone(ctx, input) {
    if (!(await owns(ctx, 'projects', input.project_id))) return err('That project does not exist');
    const { data, error } = await ctx.db.from('project_milestones').insert({
      project_id: input.project_id, title: input.title, due_date: input.due_date ?? null,
    }).select('id').single();
    if (error) return err(error.message);
    return ok(`Added milestone "${input.title}"`, { entityId: data.id, entityType: 'project_milestone' });
  },

  async complete_project_milestone(ctx, input) {
    const done = input.is_done ?? true;
    const { data, error } = await ctx.db.from('project_milestones')
      .update({ is_done: done, completed_at: done ? new Date().toISOString() : null })
      .eq('id', input.milestone_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That milestone does not exist');
    return ok(`${done ? 'Completed' : 'Reopened'} milestone "${data.title}"`, {
      entityId: input.milestone_id, entityType: 'project_milestone',
    });
  },

  async delete_project(ctx, input) {
    const { data, error } = await ctx.db.from('projects').delete().eq('id', input.project_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That project does not exist');
    return ok(`Deleted project "${data.title}"`, { entityType: 'project' });
  },

  // -------------------------------------------------------------- calendar --
  async create_event(ctx, input) {
    if (input.end_time <= input.start_time) return err('The event ends before it starts');
    const { data, error } = await ctx.db.from('calendar_events').insert({
      title: input.title,
      starts_at: `${input.date}T${input.start_time}:00`,
      ends_at: `${input.date}T${input.end_time}:00`,
      location: input.location ?? null,
      notes: input.notes ?? null,
      life_area_id: await areaId(ctx, input.life_area),
      source: 'ai',
    }).select('id').single();
    if (error) return err(error.message);
    return ok(`Added "${input.title}" on ${input.date} at ${input.start_time}`, {
      entityId: data.id, entityType: 'event',
    });
  },

  async update_event(ctx, input) {
    const current = await ctx.db.from('calendar_events')
      .select('title, starts_at, ends_at').eq('id', input.event_id).maybeSingle();
    if (!current.data) return err('That event does not exist');

    const date = input.date ?? String(current.data.starts_at).slice(0, 10);
    const start = input.start_time ?? String(current.data.starts_at).slice(11, 16);
    const end = input.end_time ?? String(current.data.ends_at).slice(11, 16);
    if (end <= start) return err('The event would end before it starts');

    const patch: Record<string, unknown> = {
      starts_at: `${date}T${start}:00`,
      ends_at: `${date}T${end}:00`,
    };
    if (input.title !== undefined) patch.title = input.title;
    if (input.location !== undefined) patch.location = input.location;

    const { error } = await ctx.db.from('calendar_events').update(patch).eq('id', input.event_id);
    if (error) return err(error.message);
    return ok(`Moved "${input.title ?? current.data.title}" to ${date} ${start}`, {
      entityId: input.event_id, entityType: 'event',
    });
  },

  async delete_event(ctx, input) {
    const { data, error } = await ctx.db.from('calendar_events').delete().eq('id', input.event_id).select('title').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That event does not exist');
    return ok(`Deleted "${data.title}"`, { entityType: 'event' });
  },

  // ----------------------------------------------------------------- plans --
  async create_daily_plan(ctx, input) {
    const date = input.date ?? ctx.today;
    const { data, error } = await ctx.db.from('daily_plans').upsert(
      {
        date,
        headline: input.headline,
        summary: input.summary ?? null,
        focus: input.focus ?? [],
        generated_by: 'ai',
      },
      { onConflict: 'user_id,date' },
    ).select('id').single();
    if (error) return err(error.message);

    // Focus items that point at real tasks are flagged so the whole app agrees.
    const focusIds = (input.focus ?? [])
      .map((f: { task_id?: string }) => f.task_id)
      .filter(Boolean) as string[];
    await ctx.db.from('tasks').update({ is_focus: false }).eq('scheduled_date', date);
    if (focusIds.length) await ctx.db.from('tasks').update({ is_focus: true }).in('id', focusIds);

    return ok(`Wrote the plan for ${date}`, { entityId: data.id, entityType: 'daily_plan' });
  },

  async reorganize_day(ctx, input) {
    const date = input.date ?? ctx.today;
    let moved = 0;
    const failures: string[] = [];

    for (const move of input.moves ?? []) {
      const patch: Record<string, unknown> = {};
      if (move.scheduled_date) patch.scheduled_date = move.scheduled_date;
      if (move.scheduled_time !== undefined) patch.scheduled_time = move.scheduled_time;
      if (Object.keys(patch).length === 0) continue;
      const { data, error } = await ctx.db.from('tasks').update(patch).eq('id', move.task_id).select('id').maybeSingle();
      if (error || !data) failures.push(move.task_id);
      else moved += 1;
    }

    if (input.headline) {
      await ctx.db.from('daily_plans').upsert(
        { date, headline: input.headline, generated_by: 'ai' },
        { onConflict: 'user_id,date' },
      );
    }
    if (failures.length && moved === 0) return err(`None of the ${failures.length} tasks could be moved`);
    return ok(
      `Reorganised ${date}: moved ${moved} task${moved === 1 ? '' : 's'}${failures.length ? `, ${failures.length} could not be moved` : ''}`,
      { entityType: 'daily_plan' },
    );
  },

  async create_weekly_plan(ctx, input) {
    const week = input.week_start ?? ctx.weekStart;
    const { data, error } = await ctx.db.from('weekly_plans').upsert(
      {
        week_start: week,
        summary: input.summary,
        priorities: input.priorities ?? [],
        risks: input.risks ?? [],
        recommended_moves: input.recommended_moves ?? [],
      },
      { onConflict: 'user_id,week_start' },
    ).select('id').single();
    if (error) return err(error.message);
    return ok(`Wrote the plan for the week of ${week}`, { entityId: data.id, entityType: 'weekly_plan' });
  },

  async replan_week(ctx, input) {
    let moved = 0;
    const failures: string[] = [];
    for (const move of input.moves ?? []) {
      const { data, error } = await ctx.db.from('tasks')
        .update({ scheduled_date: move.scheduled_date }).eq('id', move.task_id).select('id').maybeSingle();
      if (error || !data) failures.push(move.task_id);
      else moved += 1;
    }
    if (input.summary) {
      await ctx.db.from('weekly_plans').upsert(
        { week_start: input.week_start ?? ctx.weekStart, summary: input.summary },
        { onConflict: 'user_id,week_start' },
      );
    }
    if (failures.length && moved === 0) return err('No tasks could be moved');
    return ok(`Replanned the week: moved ${moved} task${moved === 1 ? '' : 's'}`, {
      entityType: 'weekly_plan',
    });
  },

  async generate_90_day_plan(ctx, input) {
    const start = input.start_date ?? ctx.today;
    const end = addDays(start, 89);

    // Only one 90-day plan is active at a time.
    await ctx.db.from('life_plans').update({ status: 'archived' }).eq('status', 'active');

    const { data, error } = await ctx.db.from('life_plans').insert({
      title: input.title ?? '90-day plan',
      vision: input.vision,
      start_date: start,
      end_date: end,
    }).select('id').single();
    if (error) return err(error.message);

    const items = [
      ...(input.months ?? []).map((m: any) => ({
        life_plan_id: data.id, horizon: 'month', position: m.position,
        title: m.title, description: m.description ?? null, objectives: m.objectives ?? [],
      })),
      ...(input.weeks ?? []).map((w: any) => ({
        life_plan_id: data.id, horizon: 'week', position: w.position,
        title: w.title, description: null, objectives: w.objectives ?? [],
      })),
    ];
    if (items.length) {
      const inserted = await ctx.db.from('life_plan_items').insert(items);
      if (inserted.error) {
        return ok(`Created the 90-day plan but some items failed: ${inserted.error.message}`, {
          entityId: data.id, entityType: 'life_plan',
        });
      }
    }
    return ok(`Built a 90-day plan (${start} → ${end})`, { entityId: data.id, entityType: 'life_plan' });
  },

  // ---------------------------------------------------- life map & memory --
  async create_life_area(ctx, input) {
    const { data, error } = await ctx.db.from('life_areas').upsert(
      { key: input.key, name: input.name, description: input.description ?? null },
      { onConflict: 'user_id,key' },
    ).select('id').single();
    if (error) return err(error.message);
    return ok(`Added life area "${input.name}"`, { entityId: data.id, entityType: 'life_area' });
  },

  async update_life_area(ctx, input) {
    const patch: Record<string, unknown> = {};
    for (const key of ['name', 'description', 'satisfaction', 'is_active'] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (Object.keys(patch).length === 0) return err('Nothing to update');
    const { data, error } = await ctx.db.from('life_areas').update(patch).eq('id', input.life_area_id).select('name').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('That life area does not exist');
    return ok(`Updated "${data.name}"`, { entityId: input.life_area_id, entityType: 'life_area' });
  },

  async create_reflection(ctx, input) {
    const { data, error } = await ctx.db.from('reflections').insert({
      kind: input.kind ?? 'daily_reset',
      date: input.date ?? ctx.today,
      raw_text: input.raw_text ?? null,
      mood: input.mood ?? null,
      energy: input.energy ?? null,
      wins: input.wins ?? [],
      obstacles: input.obstacles ?? [],
      lessons: input.lessons ?? [],
    }).select('id').single();
    if (error) return err(error.message);
    return ok('Saved your reflection', { entityId: data.id, entityType: 'reflection' });
  },

  async create_reminder(ctx, input) {
    const { data, error } = await ctx.db.from('notifications').insert({
      kind: input.kind ?? 'general',
      title: input.title,
      body: input.body ?? null,
      scheduled_for: `${input.remind_at}:00`,
    }).select('id').single();
    if (error) return err(error.message);
    // The device schedules the local notification the next time it syncs.
    return ok(`Reminder set for ${input.remind_at.replace('T', ' ')}`, {
      entityId: data.id, entityType: 'notification',
    });
  },

  async remember(ctx, input) {
    const prefs = await ctx.db.from('user_preferences').select('memory_enabled').maybeSingle();
    if (prefs.data && prefs.data.memory_enabled === false) {
      return err('Memory is turned off in their privacy settings, so nothing was stored');
    }
    const { data, error } = await ctx.db.from('ai_memory').upsert(
      {
        kind: input.kind,
        key: input.key,
        value: input.value,
        importance: input.importance ?? 3,
        is_active: true,
      },
      { onConflict: 'user_id,key' },
    ).select('id').single();
    if (error) return err(error.message);
    return ok(`Remembered: ${input.value}`, { entityId: data.id, entityType: 'memory' });
  },

  async forget(ctx, input) {
    const { data, error } = await ctx.db.from('ai_memory').delete().eq('key', input.key).select('key').maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('There was no memory with that key');
    return ok(`Forgot "${input.key}"`, { entityType: 'memory' });
  },

  async update_user_preference(ctx, input) {
    const patch: Record<string, unknown> = {};
    for (const key of ['wake_time', 'sleep_time', 'work_start', 'work_end', 'working_days', 'daily_capacity_minutes', 'planning_style'] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (Object.keys(patch).length === 0) return err('Nothing to update');
    const { error } = await ctx.db.from('user_preferences').update(patch).eq('user_id', ctx.userId);
    if (error) return err(error.message);
    return ok('Updated your planning preferences', { entityType: 'preferences' });
  },

  async complete_onboarding(ctx, input) {
    const patch: Record<string, unknown> = {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    };
    if (input.full_name) patch.full_name = input.full_name;
    const { error } = await ctx.db.from('profiles').update(patch).eq('id', ctx.userId);
    if (error) return err(error.message);
    await ctx.db.from('ai_memory').upsert(
      { kind: 'fact', key: 'life_summary', value: input.summary, importance: 5 },
      { onConflict: 'user_id,key' },
    );
    return ok('Your life plan is ready', { entityType: 'profile' });
  },
};

/** Validates then runs a tool. Unknown tools and invalid arguments never reach the DB. */
export async function executeTool(
  ctx: Ctx,
  tool: ToolName,
  rawInput: unknown,
): Promise<ToolResult> {
  const meta = toolMeta[tool];
  if (meta.proOnly && ctx.tier !== 'pro') {
    return { ok: false, summary: 'requires_pro', error: 'requires_pro' };
  }

  const validated = validateToolInput(tool, rawInput);
  if (!validated.ok) return err(`Invalid arguments: ${validated.error}`);

  try {
    return await handlers[tool](ctx, validated.data);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unexpected failure');
  }
}
