import type { CalendarEvent, Goal, Habit, HabitLog, Project, Task, UserPreferences } from '@/types/database';
import { dayLoad, plannedMinutes } from './planning';
import { differenceInCalendarDays, fromISODate, toISODate } from './date';

/**
 * Proactive intelligence.
 *
 * These are pure functions over data the app has already loaded, so observations
 * appear instantly, cost nothing, and work offline. They look for the things a person
 * cannot see from inside their own week: a goal that has quietly stopped moving, a
 * deadline that the current pace will miss, a week that does not fit, a habit that has
 * slipped, and the time of day they actually finish things.
 *
 * Nothing here nags. Each observation carries what it saw, and a sentence the user can
 * hand to the assistant to fix it.
 */

export type InsightSeverity = 'info' | 'attention' | 'urgent';

export type InsightKind =
  | 'goal_stalled'
  | 'deadline_at_risk'
  | 'week_overloaded'
  | 'habit_slipping'
  | 'productive_window'
  | 'nothing_scheduled'
  | 'project_stalled'
  | 'streak'
  | 'ahead';

export type Insight = {
  kind: InsightKind;
  /** Stable per day, so the same observation is not raised twice. */
  fingerprint: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  entityType?: 'goal' | 'project' | 'habit' | 'week' | 'day';
  entityId?: string;
  /** What the user would say to the assistant to act on this. */
  action?: string;
};

const DAY = 86_400_000;

type Input = {
  today: string;
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  projects: Project[];
  events: CalendarEvent[];
  preferences: UserPreferences | null;
};

/**
 * Calendar days since the most recent completed task attached to a goal or project.
 * Counted in days as a person would, not in elapsed hours.
 */
function daysSinceProgress(tasks: Task[], today: string, match: (task: Task) => boolean): number | null {
  const completed = tasks
    .filter((t) => match(t) && t.status === 'done' && t.completed_at)
    .map((t) => new Date(t.completed_at as string));
  if (completed.length === 0) return null;

  const latest = completed.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
  return differenceInCalendarDays(fromISODate(today), latest);
}

export function detectInsights(input: Input): Insight[] {
  const { today, goals, tasks, habits, habitLogs, projects, events, preferences } = input;
  const insights: Insight[] = [];
  const active = goals.filter((g) => g.status === 'active');

  // ── A goal that has quietly stopped moving ────────────────────────────────
  for (const goal of active) {
    const since = daysSinceProgress(tasks, today, (t) => t.goal_id === goal.id);
    const hasUpcoming = tasks.some(
      (t) => t.goal_id === goal.id && t.status === 'todo' && t.scheduled_date && t.scheduled_date >= today,
    );
    if (since !== null && since >= 5 && !hasUpcoming) {
      insights.push({
        kind: 'goal_stalled',
        fingerprint: `goal_stalled:${goal.id}:${today}`,
        title: `${goal.title} has not moved in ${since} days`,
        body: 'Nothing is scheduled for it either. A single small step this week is usually enough to restart it.',
        severity: since >= 12 ? 'attention' : 'info',
        entityType: 'goal',
        entityId: goal.id,
        action: `I haven't worked on "${goal.title}" in ${since} days. Give me one small step for this week.`,
      });
    }
  }

  // ── A deadline the current pace will not reach ────────────────────────────
  for (const goal of active) {
    if (!goal.target_date) continue;
    const daysLeft = differenceInCalendarDays(fromISODate(goal.target_date), fromISODate(today));
    if (daysLeft <= 0 || daysLeft > 120) continue;

    const created = new Date(goal.created_at).getTime();
    const elapsed = Math.max(1, Math.floor((fromISODate(today).getTime() - created) / DAY));
    const total = elapsed + daysLeft;
    const expected = Math.round((elapsed / total) * 100);

    // Only speak up when the gap is real, not noise on a goal that just started.
    if (elapsed >= 7 && goal.progress + 20 < expected) {
      insights.push({
        kind: 'deadline_at_risk',
        fingerprint: `deadline:${goal.id}:${today}`,
        title: `${goal.title} is behind its date`,
        body: `${goal.progress}% done with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left — the pace so far points to about ${expected}% by now. Worth either more time or a later date.`,
        severity: daysLeft <= 21 ? 'urgent' : 'attention',
        entityType: 'goal',
        entityId: goal.id,
        action: `"${goal.title}" is behind. Recalculate the plan or move the date.`,
      });
    }
  }

  // ── A week that does not fit ──────────────────────────────────────────────
  const weekTasks = tasks.filter(
    (t) => t.status === 'todo' && t.scheduled_date && t.scheduled_date >= today,
  );
  const capacity = preferences?.daily_capacity_minutes ?? 240;
  const workingDays = preferences?.working_days?.length ?? 5;
  const weekCapacity = capacity * Math.max(1, workingDays);
  const committed = plannedMinutes(weekTasks);
  if (committed > weekCapacity * 1.25 && weekTasks.length >= 6) {
    const excessHours = Math.round((committed - weekCapacity) / 60);
    insights.push({
      kind: 'week_overloaded',
      fingerprint: `week_overloaded:${today}`,
      title: 'The week ahead does not fit',
      body: `${weekTasks.length} open items, about ${excessHours}h more than you normally finish. Moving a few now beats dropping them on Friday.`,
      severity: 'attention',
      entityType: 'week',
      action: 'My week is overloaded. Tell me what to move.',
    });
  }

  // ── A habit that has slipped ──────────────────────────────────────────────
  for (const habit of habits.filter((h) => h.is_active)) {
    const logs = habitLogs.filter((l) => l.habit_id === habit.id);
    const doneLast7 = logs.filter(
      (l) => l.status === 'done' && differenceInCalendarDays(fromISODate(today), fromISODate(l.date)) < 7,
    ).length;
    const donePrev7 = logs.filter((l) => {
      const age = differenceInCalendarDays(fromISODate(today), fromISODate(l.date));
      return l.status === 'done' && age >= 7 && age < 14;
    }).length;

    if (donePrev7 >= 2 && doneLast7 < donePrev7 - 1 && doneLast7 < habit.target_per_week) {
      insights.push({
        kind: 'habit_slipping',
        fingerprint: `habit_slipping:${habit.id}:${today}`,
        title: `${habit.title} has slipped`,
        body: `${doneLast7} this week against ${donePrev7} the week before. Usually the answer is a smaller target, not more willpower.`,
        severity: 'info',
        entityType: 'habit',
        entityId: habit.id,
        action: `I'm slipping on "${habit.title}". Adjust it to something I can actually keep.`,
      });
    }

    // Worth noticing when something is going well, too.
    const streak = currentStreak(logs, today);
    if (streak >= 7) {
      insights.push({
        kind: 'streak',
        fingerprint: `streak:${habit.id}:${Math.floor(streak / 7)}`,
        title: `${streak} days of ${habit.title}`,
        body: 'That is the part that compounds. Nothing to do here.',
        severity: 'info',
        entityType: 'habit',
        entityId: habit.id,
      });
    }
  }

  // ── A project with no next action ─────────────────────────────────────────
  for (const project of projects.filter((p) => p.status === 'active')) {
    const hasOpen = tasks.some((t) => t.project_id === project.id && t.status === 'todo');
    const since = daysSinceProgress(tasks, today, (t) => t.project_id === project.id);
    if (!hasOpen && (since === null || since >= 7)) {
      insights.push({
        kind: 'project_stalled',
        fingerprint: `project_stalled:${project.id}:${today}`,
        title: `${project.title} has no next action`,
        body: 'A project without a next step is a wish. One concrete task is enough to make it real again.',
        severity: 'info',
        entityType: 'project',
        entityId: project.id,
        action: `Give me the next concrete action for "${project.title}".`,
      });
    }
  }

  // ── When they actually finish things ──────────────────────────────────────
  const window = productiveWindow(tasks);
  if (window) {
    insights.push({
      kind: 'productive_window',
      fingerprint: `productive_window:${window.label}:${today.slice(0, 7)}`,
      title: `You finish most things ${window.label}`,
      body: `${window.share}% of what you complete lands ${window.label}. Deep work is worth protecting there.`,
      severity: 'info',
      action: `I get most done ${window.label}. Move my most important work into that window.`,
    });
  }

  // ── A clear day, said calmly ──────────────────────────────────────────────
  const todayTasks = tasks.filter((t) => t.scheduled_date === today);
  const todayEvents = events.filter((e) => e.starts_at.slice(0, 10) === today);
  if (todayTasks.length === 0 && todayEvents.length === 0 && active.length > 0) {
    insights.push({
      kind: 'nothing_scheduled',
      fingerprint: `nothing_scheduled:${today}`,
      title: 'Nothing is planned for today',
      body: 'Rest is a valid plan. If it is not the plan, two minutes now is enough to shape the day.',
      severity: 'info',
      entityType: 'day',
      action: 'Plan my day.',
    });
  }

  const load = dayLoad(todayTasks, todayEvents, preferences);
  if (load.overloaded) {
    insights.push({
      kind: 'week_overloaded',
      fingerprint: `day_overloaded:${today}`,
      title: 'Today is heavier than you usually finish',
      body: `About ${Math.round(load.excess / 60)}h more than your normal capacity. Better to choose now than to run out of day.`,
      severity: 'attention',
      entityType: 'day',
      action: 'Today is too full. Move what does not fit.',
    });
  }

  return rank(insights);
}

/** Consecutive completed days ending today or yesterday. */
function currentStreak(logs: HabitLog[], today: string): number {
  const done = new Set(logs.filter((l) => l.status === 'done').map((l) => l.date));
  let cursor = fromISODate(today);
  if (!done.has(toISODate(cursor))) cursor = new Date(cursor.getTime() - DAY);

  let streak = 0;
  while (done.has(toISODate(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return streak;
}

/** The part of the day where most completions actually happen. */
export function productiveWindow(
  tasks: Task[],
): { label: 'in the morning' | 'in the afternoon' | 'in the evening'; share: number } | null {
  const completed = tasks.filter((t) => t.status === 'done' && t.completed_at);
  if (completed.length < 8) return null;

  const buckets = { morning: 0, afternoon: 0, evening: 0 };
  for (const task of completed) {
    const hour = new Date(task.completed_at as string).getHours();
    if (hour < 12) buckets.morning += 1;
    else if (hour < 18) buckets.afternoon += 1;
    else buckets.evening += 1;
  }

  const [name, count] = Object.entries(buckets).sort(([, a], [, b]) => b - a)[0] as [string, number];
  const share = Math.round((count / completed.length) * 100);
  if (share < 45) return null;

  return {
    label:
      name === 'morning' ? 'in the morning' : name === 'afternoon' ? 'in the afternoon' : 'in the evening',
    share,
  };
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = { urgent: 0, attention: 1, info: 2 };

/** Most pressing first, and never a wall of them. */
function rank(insights: Insight[], limit = 6): Insight[] {
  return [...insights]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, limit);
}

/** The one worth putting on Home. */
export function headlineInsight(insights: Insight[]): Insight | null {
  return insights.find((i) => i.severity !== 'info') ?? insights[0] ?? null;
}
