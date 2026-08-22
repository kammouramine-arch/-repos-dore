import { flushOutbox, type OutboxEntry } from '@/lib/outbox';
import { createTask, rescheduleTask, setTaskDone } from './tasks';
import { logHabit } from './habits';

/**
 * Replays queued offline mutations. The queue records when the user acted, so a
 * completion made offline does not clobber a newer change made elsewhere.
 */
export async function runSync() {
  return flushOutbox(async (entry: OutboxEntry) => {
    switch (entry.kind) {
      case 'task.complete':
        await setTaskDone(String(entry.payload.id), true);
        return;
      case 'task.reopen':
        await setTaskDone(String(entry.payload.id), false);
        return;
      case 'task.create':
        await createTask(entry.payload as Record<string, never>);
        return;
      case 'task.reschedule':
        await rescheduleTask(
          String(entry.payload.id),
          String(entry.payload.scheduled_date),
          (entry.payload.scheduled_time as string | null) ?? undefined,
        );
        return;
      case 'habit.log':
        await logHabit(
          String(entry.payload.habit_id),
          String(entry.payload.date),
          (entry.payload.status as 'done' | 'skipped' | 'missed') ?? 'done',
        );
        return;
      default:
        return;
    }
  });
}
