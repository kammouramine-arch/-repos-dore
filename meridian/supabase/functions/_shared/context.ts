import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Assembles the snapshot of the user's life that the assistant reasons over.
 * Everything here is read with the caller's own credentials, so it can only ever
 * contain that user's rows. Ids are included so tool calls can reference real records.
 */

export type LifeContext = {
  today: string;
  weekStart: string;
  tier: 'free' | 'pro';
  onboardingCompleted: boolean;
  text: string;
};

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return iso(d);
}

function addDays(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

export async function buildContext(
  db: SupabaseClient,
  timezoneOffsetMinutes = 0,
): Promise<LifeContext> {
  // The client sends its own offset so "today" matches the user's day, not UTC.
  const now = new Date(Date.now() + timezoneOffsetMinutes * 60_000);
  const today = iso(now);
  const weekStart = mondayOf(now);
  const horizon = addDays(today, 7);

  const [
    profile,
    prefs,
    subscription,
    areas,
    goals,
    milestones,
    habits,
    habitLogs,
    projects,
    tasks,
    events,
    memory,
    plan,
    reflections,
    lifePlan,
  ] = await Promise.all([
    db.from('profiles').select('full_name, timezone, onboarding_completed').maybeSingle(),
    db.from('user_preferences').select('*').maybeSingle(),
    db.from('subscriptions').select('tier, status').maybeSingle(),
    db.from('life_areas').select('id, key, name, satisfaction').eq('is_active', true).order('sort_order'),
    db.from('goals').select('id, title, life_area_id, target_date, priority, status, progress')
      .in('status', ['active', 'paused']).order('priority', { ascending: false }).limit(25),
    db.from('goal_milestones').select('id, goal_id, title, due_date, is_done').eq('is_done', false).limit(40),
    db.from('habits').select('id, title, cadence, target_per_week, preferred_time, life_area_id')
      .eq('is_active', true).limit(25),
    db.from('habit_logs').select('habit_id, date, status').gte('date', addDays(today, -14)).limit(300),
    db.from('projects').select('id, title, status, due_date, progress').in('status', ['active', 'paused']).limit(20),
    db.from('tasks')
      .select('id, title, scheduled_date, scheduled_time, duration_minutes, priority, energy, status, is_focus, goal_id, project_id')
      .or(`and(scheduled_date.gte.${addDays(today, -3)},scheduled_date.lte.${horizon}),scheduled_date.is.null`)
      .neq('status', 'cancelled')
      .order('scheduled_date', { nullsFirst: false })
      .limit(120),
    db.from('calendar_events').select('id, title, starts_at, ends_at, location')
      .gte('starts_at', `${today}T00:00:00Z`).lte('starts_at', `${horizon}T23:59:59Z`)
      .order('starts_at').limit(60),
    db.from('ai_memory').select('kind, key, value, importance').eq('is_active', true)
      .order('importance', { ascending: false }).limit(60),
    db.from('daily_plans').select('date, headline, summary, focus').eq('date', today).maybeSingle(),
    db.from('reflections').select('date, kind, mood, energy, wins, obstacles, lessons')
      .order('date', { ascending: false }).limit(3),
    db.from('life_plans').select('id, title, vision, start_date, end_date, status')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const areaName = new Map((areas.data ?? []).map((a) => [a.id as string, a.name as string]));
  const logsByHabit = new Map<string, { date: string; status: string }[]>();
  for (const log of habitLogs.data ?? []) {
    const list = logsByHabit.get(log.habit_id as string) ?? [];
    list.push({ date: log.date as string, status: log.status as string });
    logsByHabit.set(log.habit_id as string, list);
  }
  const milestonesByGoal = new Map<string, { id: string; title: string; due_date: string | null }[]>();
  for (const m of milestones.data ?? []) {
    const list = milestonesByGoal.get(m.goal_id as string) ?? [];
    list.push({ id: m.id as string, title: m.title as string, due_date: m.due_date as string | null });
    milestonesByGoal.set(m.goal_id as string, list);
  }

  const lines: string[] = [];
  const push = (label: string, body: string) => lines.push(`## ${label}\n${body || '(none)'}`);

  const p = prefs.data;
  push(
    'Who they are',
    [
      `Name: ${profile.data?.full_name ?? 'unknown'}`,
      `Today: ${today} (week starting ${weekStart})`,
      `Onboarding complete: ${profile.data?.onboarding_completed ? 'yes' : 'no'}`,
      `Plan: ${subscription.data?.tier ?? 'free'}`,
      p
        ? `Wakes ${p.wake_time}, sleeps ${p.sleep_time}. Works ${p.work_start}–${p.work_end} on days ${JSON.stringify(p.working_days)} (0=Sunday). Realistic daily task capacity: ${p.daily_capacity_minutes} minutes. Planning style: ${p.planning_style}. Preferred tone: ${p.ai_tone}.`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  push(
    'Life areas',
    (areas.data ?? [])
      .map((a) => `- ${a.name} [${a.key}] id=${a.id}${a.satisfaction != null ? ` satisfaction=${a.satisfaction}%` : ''}`)
      .join('\n'),
  );

  push(
    'Goals',
    (goals.data ?? [])
      .map((g) => {
        const ms = milestonesByGoal.get(g.id as string) ?? [];
        const area = g.life_area_id ? areaName.get(g.life_area_id as string) : null;
        return [
          `- "${g.title}" id=${g.id} ${g.progress}% ${g.priority} priority${area ? `, area ${area}` : ''}${g.target_date ? `, target ${g.target_date}` : ''}${g.status === 'paused' ? ' (paused)' : ''}`,
          ...ms.slice(0, 4).map((m) => `    open milestone: "${m.title}" id=${m.id}${m.due_date ? ` due ${m.due_date}` : ''}`),
        ].join('\n');
      })
      .join('\n'),
  );

  push(
    'Projects',
    (projects.data ?? [])
      .map((pr) => `- "${pr.title}" id=${pr.id} ${pr.progress}%${pr.due_date ? `, due ${pr.due_date}` : ''}`)
      .join('\n'),
  );

  push(
    'Habits (last 14 days)',
    (habits.data ?? [])
      .map((h) => {
        const logs = logsByHabit.get(h.id as string) ?? [];
        const done = logs.filter((l) => l.status === 'done').length;
        return `- "${h.title}" id=${h.id} ${h.cadence}, target ${h.target_per_week}/week${h.preferred_time ? ` at ${h.preferred_time}` : ''} — completed ${done} of the last 14 days`;
      })
      .join('\n'),
  );

  const byDate = new Map<string, string[]>();
  for (const t of tasks.data ?? []) {
    const key = (t.scheduled_date as string | null) ?? 'unscheduled';
    const list = byDate.get(key) ?? [];
    list.push(
      `  - "${t.title}" id=${t.id} ${t.duration_minutes}min ${t.priority}${t.scheduled_time ? ` at ${t.scheduled_time}` : ''}${t.is_focus ? ' [focus]' : ''} [${t.status}]`,
    );
    byDate.set(key, list);
  }
  push(
    'Tasks (3 days back to 7 days ahead)',
    [...byDate.entries()]
      .sort(([a], [b]) => (a === 'unscheduled' ? 1 : b === 'unscheduled' ? -1 : a.localeCompare(b)))
      .map(([date, items]) => `${date}:\n${items.join('\n')}`)
      .join('\n'),
  );

  push(
    'Calendar (next 7 days)',
    (events.data ?? [])
      .map((e) => `- "${e.title}" id=${e.id} ${e.starts_at} → ${e.ends_at}${e.location ? ` @ ${e.location}` : ''}`)
      .join('\n'),
  );

  push(
    "Today's plan",
    plan.data
      ? `${plan.data.headline ?? ''}\n${plan.data.summary ?? ''}\nFocus: ${JSON.stringify(plan.data.focus ?? [])}`
      : '',
  );

  push(
    '90-day plan',
    lifePlan.data
      ? `"${lifePlan.data.title}" ${lifePlan.data.start_date} → ${lifePlan.data.end_date}. Vision: ${lifePlan.data.vision ?? ''}`
      : '',
  );

  push(
    'What you remember',
    (memory.data ?? []).map((m) => `- [${m.kind}] ${m.key}: ${m.value}`).join('\n'),
  );

  push(
    'Recent reflections',
    (reflections.data ?? [])
      .map(
        (r) =>
          `- ${r.date} (${r.kind})${r.mood ? ` mood ${r.mood}/5` : ''}${r.energy ? ` energy ${r.energy}/5` : ''}: wins ${JSON.stringify(r.wins)}, obstacles ${JSON.stringify(r.obstacles)}`,
      )
      .join('\n'),
  );

  return {
    today,
    weekStart,
    tier: (subscription.data?.tier as 'free' | 'pro') ?? 'free',
    onboardingCompleted: Boolean(profile.data?.onboarding_completed),
    text: lines.join('\n\n'),
  };
}
