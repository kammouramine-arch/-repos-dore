import { detectInsights, headlineInsight, productiveWindow } from '@/utils/insights';
import type { Goal, Habit, HabitLog, Project, Task, UserPreferences } from '@/types/database';

const TODAY = '2026-03-10';
const DAY_MS = 86_400_000;
const BASE = new Date(`${TODAY}T00:00:00`).getTime();

/** An ISO timestamp `days` from today, at a given local hour. */
const at = (days: number, hour = 10) => {
  const date = new Date(BASE + days * DAY_MS);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

/** The ISO date `offset` days from today. */
const day = (offset: number) => {
  const date = new Date(BASE + offset * DAY_MS);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const task = (over: Partial<Task> = {}): Task => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  user_id: 'u1',
  life_area_id: null,
  goal_id: null,
  project_id: null,
  habit_id: null,
  title: 'Task',
  notes: null,
  scheduled_date: TODAY,
  scheduled_time: null,
  duration_minutes: 30,
  priority: 'medium',
  energy: 'medium',
  status: 'todo',
  is_focus: false,
  order_index: 0,
  source: 'user',
  completed_at: null,
  created_at: at(-30),
  updated_at: at(-30),
  ...over,
});

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: over.id ?? 'g1',
  user_id: 'u1',
  life_area_id: null,
  title: 'Save €10,000',
  description: null,
  why: null,
  target_date: null,
  priority: 'high',
  status: 'active',
  progress: 20,
  strategy: [],
  source: 'user',
  completed_at: null,
  created_at: at(-30),
  updated_at: at(-30),
  ...over,
});

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: over.id ?? 'h1',
  user_id: 'u1',
  life_area_id: null,
  goal_id: null,
  title: 'Gym',
  cadence: 'weekly',
  target_per_week: 3,
  days_of_week: null,
  preferred_time: null,
  duration_minutes: 60,
  reminder_enabled: false,
  is_active: true,
  source: 'user',
  created_at: at(-30),
  updated_at: at(-30),
  ...over,
});

const log = (date: string, habitId = 'h1'): HabitLog => ({
  id: `${habitId}-${date}`,
  user_id: 'u1',
  habit_id: habitId,
  date,
  status: 'done',
  note: null,
  created_at: at(0),
});

const project = (over: Partial<Project> = {}): Project => ({
  id: over.id ?? 'p1',
  user_id: 'u1',
  life_area_id: null,
  goal_id: null,
  title: 'Business launch',
  description: null,
  status: 'active',
  due_date: null,
  progress: 10,
  notes: null,
  source: 'user',
  created_at: at(-30),
  updated_at: at(-30),
  ...over,
});

const preferences = { daily_capacity_minutes: 240, working_days: [1, 2, 3, 4, 5] } as UserPreferences;

const base = {
  today: TODAY,
  goals: [] as Goal[],
  tasks: [] as Task[],
  habits: [] as Habit[],
  habitLogs: [] as HabitLog[],
  projects: [] as Project[],
  events: [],
  preferences,
};

describe('stalled goals', () => {
  it('notices a goal with no recent work and nothing scheduled', () => {
    const insights = detectInsights({
      ...base,
      goals: [goal()],
      tasks: [task({ goal_id: 'g1', status: 'done', completed_at: at(-8), scheduled_date: day(-8) })],
    });

    const stalled = insights.find((i) => i.kind === 'goal_stalled');
    expect(stalled).toBeDefined();
    expect(stalled?.title).toMatch(/8 days/);
    expect(stalled?.action).toContain('Save €10,000');
  });

  it('stays quiet when work is already scheduled for it', () => {
    const insights = detectInsights({
      ...base,
      goals: [goal()],
      tasks: [
        task({ goal_id: 'g1', status: 'done', completed_at: at(-8), scheduled_date: day(-8) }),
        task({ goal_id: 'g1', status: 'todo', scheduled_date: day(2) }),
      ],
    });
    expect(insights.find((i) => i.kind === 'goal_stalled')).toBeUndefined();
  });
});

describe('deadlines', () => {
  it('flags a goal whose pace will not reach its date', () => {
    const insights = detectInsights({
      ...base,
      goals: [goal({ progress: 10, target_date: day(20), created_at: at(-40) })],
    });

    const risk = insights.find((i) => i.kind === 'deadline_at_risk');
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe('urgent');
    expect(risk?.body).toMatch(/10% done/);
  });

  it('does not judge a goal that only just started', () => {
    const insights = detectInsights({
      ...base,
      goals: [goal({ progress: 0, target_date: day(30), created_at: at(-2) })],
    });
    expect(insights.find((i) => i.kind === 'deadline_at_risk')).toBeUndefined();
  });

  it('ignores goals that are on pace', () => {
    const insights = detectInsights({
      ...base,
      goals: [goal({ progress: 60, target_date: day(30), created_at: at(-30) })],
    });
    expect(insights.find((i) => i.kind === 'deadline_at_risk')).toBeUndefined();
  });
});

describe('overload', () => {
  it('says when the week ahead does not fit', () => {
    const insights = detectInsights({
      ...base,
      tasks: Array.from({ length: 12 }, (_, i) =>
        task({ id: `t${i}`, duration_minutes: 180, scheduled_date: day(i % 5) }),
      ),
    });

    const overload = insights.find((i) => i.kind === 'week_overloaded');
    expect(overload).toBeDefined();
    expect(overload?.action).toMatch(/move/i);
  });

  it('says nothing about a week that fits', () => {
    const insights = detectInsights({
      ...base,
      tasks: [task({ duration_minutes: 60, scheduled_date: day(1) })],
    });
    expect(insights.find((i) => i.kind === 'week_overloaded')).toBeUndefined();
  });
});

describe('habits', () => {
  it('notices a habit that has slipped against the week before', () => {
    const insights = detectInsights({
      ...base,
      habits: [habit()],
      habitLogs: [log(day(-8)), log(day(-9)), log(day(-11)), log(day(-2))],
    });

    const slipping = insights.find((i) => i.kind === 'habit_slipping');
    expect(slipping).toBeDefined();
    expect(slipping?.body).toMatch(/smaller target, not more willpower/);
  });

  it('never scolds — the copy stays about the plan', () => {
    const insights = detectInsights({
      ...base,
      habits: [habit()],
      habitLogs: [log(day(-8)), log(day(-9)), log(day(-11))],
    });
    for (const insight of insights) {
      expect(`${insight.title} ${insight.body}`).not.toMatch(/fail|lazy|excuse|discipline/i);
    }
  });

  it('marks a real streak', () => {
    const logs = Array.from({ length: 9 }, (_, i) => log(day(-i)));
    const insights = detectInsights({ ...base, habits: [habit()], habitLogs: logs });

    const streak = insights.find((i) => i.kind === 'streak');
    expect(streak).toBeDefined();
    expect(streak?.title).toMatch(/9 days/);
  });
});

describe('projects', () => {
  it('notices a project with no next action', () => {
    const insights = detectInsights({ ...base, projects: [project()] });
    expect(insights.find((i) => i.kind === 'project_stalled')).toBeDefined();
  });

  it('is quiet when the project has open work', () => {
    const insights = detectInsights({
      ...base,
      projects: [project()],
      tasks: [task({ project_id: 'p1', status: 'todo' })],
    });
    expect(insights.find((i) => i.kind === 'project_stalled')).toBeUndefined();
  });
});

describe('productive window', () => {
  it('finds when someone actually finishes things', () => {
    const tasks = Array.from({ length: 10 }, (_, i) =>
      task({ id: `t${i}`, status: 'done', completed_at: at(-i, i < 8 ? 9 : 20) }),
    );
    const window = productiveWindow(tasks);
    expect(window?.label).toBe('in the morning');
    expect(window?.share).toBeGreaterThanOrEqual(45);
  });

  it('says nothing without enough evidence', () => {
    expect(productiveWindow([task({ status: 'done', completed_at: at(0, 9) })])).toBeNull();
  });

  it('says nothing when completions are spread evenly', () => {
    const tasks = [
      ...Array.from({ length: 4 }, (_, i) => task({ id: `m${i}`, status: 'done', completed_at: at(-i, 9) })),
      ...Array.from({ length: 4 }, (_, i) => task({ id: `a${i}`, status: 'done', completed_at: at(-i, 15) })),
      ...Array.from({ length: 4 }, (_, i) => task({ id: `e${i}`, status: 'done', completed_at: at(-i, 20) })),
    ];
    expect(productiveWindow(tasks)).toBeNull();
  });
});

describe('presentation', () => {
  it('never floods the screen', () => {
    const insights = detectInsights({
      ...base,
      goals: Array.from({ length: 10 }, (_, i) =>
        goal({ id: `g${i}`, title: `Goal ${i}`, target_date: day(15), progress: 0, created_at: at(-30) }),
      ),
      tasks: Array.from({ length: 10 }, (_, i) =>
        task({ id: `t${i}`, goal_id: `g${i}`, status: 'done', completed_at: at(-20), scheduled_date: day(-20) }),
      ),
    });
    expect(insights.length).toBeLessThanOrEqual(6);
  });

  it('puts the most pressing thing first', () => {
    const insights = detectInsights({
      ...base,
      goals: [goal({ progress: 0, target_date: day(10), created_at: at(-40) })],
      habits: [habit()],
      habitLogs: Array.from({ length: 9 }, (_, i) => log(day(-i))),
    });

    expect(headlineInsight(insights)?.severity).not.toBe('info');
    expect(insights[0].severity).not.toBe('info');
  });

  it('gives every observation a stable fingerprint', () => {
    const input = { ...base, projects: [project()] };
    const first = detectInsights(input);
    const second = detectInsights(input);
    expect(first.map((i) => i.fingerprint)).toEqual(second.map((i) => i.fingerprint));
  });

  it('notices an empty day only when there is something to plan toward', () => {
    expect(detectInsights({ ...base }).find((i) => i.kind === 'nothing_scheduled')).toBeUndefined();
    expect(
      detectInsights({ ...base, goals: [goal()] }).find((i) => i.kind === 'nothing_scheduled'),
    ).toBeDefined();
  });
});
