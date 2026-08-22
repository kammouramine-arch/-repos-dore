import {
  dayCompletion,
  dayLoad,
  eventMinutes,
  localHeadline,
  orderDay,
  pickFocus,
  plannedMinutes,
  suggestMoves,
  taskScore,
} from '@/utils/planning';
import type { CalendarEvent, Task } from '@/types/database';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: overrides.id ?? Math.random().toString(36).slice(2),
  user_id: 'u1',
  life_area_id: null,
  goal_id: null,
  project_id: null,
  habit_id: null,
  title: 'Task',
  notes: null,
  scheduled_date: '2026-03-10',
  scheduled_time: null,
  duration_minutes: 30,
  priority: 'medium',
  energy: 'medium',
  status: 'todo',
  is_focus: false,
  order_index: 0,
  source: 'user',
  completed_at: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
});

const event = (start: string, end: string): CalendarEvent => ({
  id: Math.random().toString(36).slice(2),
  user_id: 'u1',
  life_area_id: null,
  title: 'Meeting',
  notes: null,
  location: null,
  starts_at: start,
  ends_at: end,
  all_day: false,
  provider: 'internal',
  external_id: null,
  source: 'user',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
});

const TODAY = '2026-03-10';

describe('taskScore', () => {
  it('ranks focus and high priority above ordinary work', () => {
    const focus = task({ is_focus: true, priority: 'medium' });
    const high = task({ priority: 'high' });
    const low = task({ priority: 'low' });

    expect(taskScore(focus, TODAY)).toBeGreaterThan(taskScore(high, TODAY));
    expect(taskScore(high, TODAY)).toBeGreaterThan(taskScore(low, TODAY));
  });

  it('lifts overdue work', () => {
    const overdue = task({ scheduled_date: '2026-03-01' });
    const todays = task({ scheduled_date: TODAY });
    expect(taskScore(overdue, TODAY)).toBeGreaterThan(taskScore(todays, TODAY));
  });
});

describe('orderDay', () => {
  it('puts timed commitments first, in clock order, and completed work last', () => {
    const nine = task({ id: 'a', scheduled_time: '09:00' });
    const seven = task({ id: 'b', scheduled_time: '07:30' });
    const loose = task({ id: 'c', priority: 'high' });
    const done = task({ id: 'd', status: 'done', scheduled_time: '06:00' });

    const ordered = orderDay([done, loose, nine, seven], TODAY).map((t) => t.id);
    expect(ordered).toEqual(['b', 'a', 'c', 'd']);
  });
});

describe('pickFocus', () => {
  it('never returns more than three priorities', () => {
    const tasks = Array.from({ length: 9 }, (_, i) => task({ id: `t${i}`, priority: 'high' }));
    expect(pickFocus(tasks, TODAY)).toHaveLength(3);
  });

  it('prefers explicitly flagged focus tasks', () => {
    const flagged = task({ id: 'flag', is_focus: true, priority: 'low' });
    const others = Array.from({ length: 4 }, (_, i) => task({ id: `o${i}`, priority: 'high' }));
    expect(pickFocus([...others, flagged], TODAY).map((t) => t.id)).toContain('flag');
  });

  it('ignores completed work', () => {
    const done = task({ id: 'done', status: 'done', is_focus: true });
    const open = task({ id: 'open' });
    expect(pickFocus([done, open], TODAY).map((t) => t.id)).toEqual(['open']);
  });
});

describe('dayLoad', () => {
  it('counts tasks and meetings against a realistic capacity', () => {
    const tasks = [task({ duration_minutes: 120 }), task({ duration_minutes: 60 })];
    const events = [event('2026-03-10T09:00:00Z', '2026-03-10T10:00:00Z')];
    const load = dayLoad(tasks, events, { daily_capacity_minutes: 240 });

    expect(load.committed).toBe(240);
    expect(load.overloaded).toBe(false);
    expect(load.excess).toBe(0);
  });

  it('flags an overloaded day and says by how much', () => {
    const tasks = Array.from({ length: 6 }, () => task({ duration_minutes: 60 }));
    const load = dayLoad(tasks, [], { daily_capacity_minutes: 240 });

    expect(load.overloaded).toBe(true);
    expect(load.excess).toBe(120);
  });

  it('does not count finished work as commitment', () => {
    const load = dayLoad([task({ status: 'done', duration_minutes: 300 })], [], {
      daily_capacity_minutes: 240,
    });
    expect(load.committed).toBe(0);
  });
});

describe('dayCompletion', () => {
  it('is zero for an empty day rather than a division by zero', () => {
    expect(dayCompletion([])).toBe(0);
  });

  it('weights focus tasks double', () => {
    const focusDone = task({ is_focus: true, status: 'done' });
    const other = task({ status: 'todo' });
    expect(dayCompletion([focusDone, other])).toBe(67);
  });

  it('ignores cancelled tasks', () => {
    expect(dayCompletion([task({ status: 'done' }), task({ status: 'cancelled' })])).toBe(100);
  });
});

describe('suggestMoves', () => {
  it('offers the least valuable movable work first and stops once enough is freed', () => {
    const tasks = [
      task({ id: 'low', priority: 'low', duration_minutes: 60 }),
      task({ id: 'high', priority: 'high', duration_minutes: 60 }),
      task({ id: 'fixed', scheduled_time: '10:00', priority: 'low', duration_minutes: 60 }),
      task({ id: 'focus', is_focus: true, priority: 'low', duration_minutes: 60 }),
    ];

    const moves = suggestMoves(tasks, TODAY, 60).map((t) => t.id);
    expect(moves).toEqual(['low']);
    expect(moves).not.toContain('fixed');
    expect(moves).not.toContain('focus');
  });
});

describe('localHeadline', () => {
  it('is calm when nothing is planned', () => {
    expect(localHeadline([], [], dayLoad([], [], null))).toMatch(/clear/i);
  });

  it('does not shame an unfinished day', () => {
    const tasks = Array.from({ length: 8 }, () => task({ duration_minutes: 60 }));
    const headline = localHeadline(tasks, [], dayLoad(tasks, [], { daily_capacity_minutes: 240 }));
    expect(headline).toMatch(/heavier/i);
    expect(headline).not.toMatch(/fail|behind|lazy/i);
  });
});

describe('minute maths', () => {
  it('sums event durations', () => {
    expect(eventMinutes([event('2026-03-10T09:00:00Z', '2026-03-10T10:30:00Z')])).toBe(90);
  });

  it('sums planned task minutes', () => {
    expect(plannedMinutes([task({ duration_minutes: 45 }), task({ duration_minutes: 15 })])).toBe(60);
  });
});
