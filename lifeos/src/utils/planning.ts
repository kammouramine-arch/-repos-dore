import type { CalendarEvent, Task, UserPreferences } from '@/types/database';

/**
 * Local planning heuristics. These run on device so the app can still prioritise,
 * detect overload and pick focus items when the assistant is unreachable — the AI
 * refines them, it is not required for the basics to work.
 */

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

export function taskScore(task: Task, today: string): number {
  let score = PRIORITY_WEIGHT[task.priority] * 10;
  if (task.is_focus) score += 25;
  if (task.goal_id) score += 6;
  if (task.project_id) score += 4;
  if (task.habit_id) score += 3;
  if (task.scheduled_time) score += 5;
  if (task.scheduled_date && task.scheduled_date < today) score += 12; // overdue
  return score;
}

/** Orders a day the way a person would: fixed times first, then weight. */
export function orderDay(tasks: Task[], today: string): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
    if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
    if (a.scheduled_time) return -1;
    if (b.scheduled_time) return 1;
    return taskScore(b, today) - taskScore(a, today);
  });
}

/** The few things that actually matter today. Never more than three. */
export function pickFocus(tasks: Task[], today: string, limit = 3): Task[] {
  const open = tasks.filter((t) => t.status === 'todo');
  const explicit = open.filter((t) => t.is_focus);
  if (explicit.length >= limit) return orderDay(explicit, today).slice(0, limit);
  const rest = orderDay(
    open.filter((t) => !t.is_focus),
    today,
  );
  return [...explicit, ...rest].slice(0, limit);
}

export function plannedMinutes(tasks: Task[]): number {
  return tasks
    .filter((t) => t.status === 'todo' || t.status === 'done')
    .reduce((sum, t) => sum + t.duration_minutes, 0);
}

export function eventMinutes(events: CalendarEvent[]): number {
  return events.reduce((sum, e) => {
    const start = new Date(e.starts_at).getTime();
    const end = new Date(e.ends_at).getTime();
    return sum + Math.max(0, Math.round((end - start) / 60000));
  }, 0);
}

export type DayLoad = {
  capacity: number;
  committed: number;
  ratio: number;
  overloaded: boolean;
  /** How many minutes would need to move to make the day realistic. */
  excess: number;
};

export function dayLoad(
  tasks: Task[],
  events: CalendarEvent[],
  preferences: Pick<UserPreferences, 'daily_capacity_minutes'> | null,
): DayLoad {
  const capacity = preferences?.daily_capacity_minutes ?? 240;
  const committed =
    plannedMinutes(tasks.filter((t) => t.status === 'todo')) + eventMinutes(events);
  const ratio = capacity > 0 ? committed / capacity : 0;
  return {
    capacity,
    committed,
    ratio,
    overloaded: ratio > 1.1,
    excess: Math.max(0, committed - capacity),
  };
}

/** Completion of the day's plan — not a vanity productivity score. */
export function dayCompletion(tasks: Task[]): number {
  const relevant = tasks.filter((t) => t.status !== 'cancelled');
  if (relevant.length === 0) return 0;
  const weightOf = (t: Task) => (t.is_focus ? 2 : 1);
  const total = relevant.reduce((s, t) => s + weightOf(t), 0);
  const done = relevant.filter((t) => t.status === 'done').reduce((s, t) => s + weightOf(t), 0);
  return Math.round((done / total) * 100);
}

/**
 * Which tasks to suggest moving when a week is overloaded: lowest value first,
 * never a fixed-time commitment, never a focus item.
 */
export function suggestMoves(tasks: Task[], today: string, excessMinutes: number): Task[] {
  const movable = tasks
    .filter((t) => t.status === 'todo' && !t.scheduled_time && !t.is_focus)
    .sort((a, b) => taskScore(a, today) - taskScore(b, today));

  const picked: Task[] = [];
  let freed = 0;
  for (const task of movable) {
    if (freed >= excessMinutes) break;
    picked.push(task);
    freed += task.duration_minutes;
  }
  return picked;
}

/** A single honest sentence about the day, used on Home when there is no AI plan yet. */
export function localHeadline(
  tasks: Task[],
  events: CalendarEvent[],
  load: DayLoad,
  now: Date = new Date(),
): string {
  const open = tasks.filter((t) => t.status === 'todo');
  const done = tasks.filter((t) => t.status === 'done').length;

  if (tasks.length === 0 && events.length === 0) {
    return 'Your day is clear. Tell me what matters and I will shape it.';
  }
  if (open.length === 0) {
    return `Everything planned for today is done — ${done} item${done === 1 ? '' : 's'}. Rest counts.`;
  }
  if (load.overloaded) {
    return `Today is heavier than your usual capacity. ${open.length} open items — I would move a few.`;
  }
  const next = events.find((e) => new Date(e.starts_at) > now);
  if (next) {
    const time = new Date(next.starts_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${open.length} open item${open.length === 1 ? '' : 's'}, and ${next.title} at ${time}.`;
  }
  return `${open.length} open item${open.length === 1 ? '' : 's'} today. Your priorities are clear.`;
}
