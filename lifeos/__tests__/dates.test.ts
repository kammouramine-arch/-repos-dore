import {
  formatTime,
  friendlyDate,
  greeting,
  minutesToLabel,
  relativeDays,
  toISODate,
  weekRange,
  weekStartISO,
} from '@/utils/date';

describe('date helpers', () => {
  it('formats local dates without drifting across time zones', () => {
    expect(toISODate(new Date(2026, 2, 10, 23, 30))).toBe('2026-03-10');
    expect(toISODate(new Date(2026, 2, 10, 0, 5))).toBe('2026-03-10');
  });

  it('starts the week on Monday', () => {
    expect(weekStartISO(new Date(2026, 2, 15))).toBe('2026-03-09'); // Sunday
    expect(weekStartISO(new Date(2026, 2, 9))).toBe('2026-03-09'); // Monday
  });

  it('produces seven days for a week', () => {
    const range = weekRange(new Date(2026, 2, 11));
    expect(range.days).toHaveLength(7);
    expect(range.start).toBe('2026-03-09');
    expect(range.end).toBe('2026-03-15');
  });

  it('speaks about dates the way a person does', () => {
    const now = new Date(2026, 2, 10);
    expect(friendlyDate('2026-03-10', now)).toBe('Today');
    expect(friendlyDate('2026-03-11', now)).toBe('Tomorrow');
    expect(friendlyDate('2026-03-09', now)).toBe('Yesterday');
    expect(friendlyDate('2026-03-20', now)).toMatch(/Mar/);
  });

  it('describes distance in days', () => {
    const now = new Date(2026, 2, 10);
    expect(relativeDays('2026-03-10', now)).toBe('today');
    expect(relativeDays('2026-03-11', now)).toBe('in 1 day');
    expect(relativeDays('2026-03-01', now)).toBe('9 days ago');
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 2, 10, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 2, 10, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 2, 10, 21))).toBe('Good evening');
  });

  it('trims Postgres time values for display', () => {
    expect(formatTime('09:30:00')).toBe('09:30');
    expect(formatTime(null)).toBeNull();
  });

  it('labels durations', () => {
    expect(minutesToLabel(45)).toBe('45m');
    expect(minutesToLabel(60)).toBe('1h');
    expect(minutesToLabel(150)).toBe('2h 30m');
  });
});
