import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns';

/** ISO date (YYYY-MM-DD) in local time — the format every `date` column uses. */
export function toISODate(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function fromISODate(value: string): Date {
  return parseISO(`${value}T00:00:00`);
}

export const todayISO = () => toISODate(new Date());

export function weekStartISO(date: Date = new Date()): string {
  return toISODate(startOfWeek(date, { weekStartsOn: 1 }));
}

export function weekRange(date: Date = new Date()): { start: string; end: string; days: string[] } {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
  return { start: toISODate(start), end: toISODate(end), days };
}

/** "Good morning" / "Good afternoon" / "Good evening". */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Today", "Tomorrow", "Yesterday", else "Thu 14 Mar". */
export function friendlyDate(iso: string, now: Date = new Date()): string {
  const date = fromISODate(iso);
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return format(date, 'EEE d MMM');
}

/** "in 12 days" / "3 days ago" / "today". */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const diff = differenceInCalendarDays(fromISODate(iso), now);
  if (diff === 0) return 'today';
  if (diff > 0) return `in ${diff} day${diff === 1 ? '' : 's'}`;
  return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`;
}

/** "09:30" from a Postgres time value like "09:30:00". */
export function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':');
  if (h === undefined || m === undefined) return null;
  return `${h.padStart(2, '0')}:${m}`;
}

export function formatClock(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

export function minutesToLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export { addDays, differenceInCalendarDays, isSameDay, format };
