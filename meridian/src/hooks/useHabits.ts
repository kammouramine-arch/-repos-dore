import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cache';
import { enqueue } from '@/lib/outbox';
import {
  clearHabitLog,
  createHabit,
  deleteHabit,
  fetchHabitLogs,
  fetchHabits,
  logHabit,
  updateHabit,
} from '@/services/habits';
import type { Habit } from '@/types/database';
import { addDays, todayISO, toISODate } from '@/utils/date';
import { useConnectivity } from '@/state/ConnectivityProvider';
import { track } from '@/services/analytics';
import { useCachedQuery } from './useCachedQuery';

export function useHabits(includeInactive = false) {
  return useCachedQuery(['habits', String(includeInactive)], cacheKeys.habits, () =>
    fetchHabits(includeInactive),
  );
}

/** Logs for the trailing four weeks — enough for streaks and the consistency grid. */
export function useHabitLogs(days = 28) {
  const from = toISODate(addDays(new Date(), -days));
  return useCachedQuery(['habit-logs', days], `habit-logs.${days}`, () =>
    fetchHabitLogs(from, todayISO()),
  );
}

export function useHabitActions() {
  const client = useQueryClient();
  const { online, refreshPending } = useConnectivity();
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['habits'] });
    void client.invalidateQueries({ queryKey: ['habit-logs'] });
    void client.invalidateQueries({ queryKey: ['progress'] });
  };

  return {
    create: useMutation({
      mutationFn: (input: Partial<Habit>) => createHabit(input),
      onSuccess: () => {
        track('habit_created');
        invalidate();
      },
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<Habit> }) => updateHabit(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteHabit(id), onSuccess: invalidate }),
    log: useMutation({
      mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
        if (!online) {
          await enqueue('habit.log', { habit_id: habitId, date, status: 'done', id: `${habitId}:${date}` });
          await refreshPending();
          return;
        }
        await logHabit(habitId, date, 'done');
      },
      onSuccess: () => {
        track('habit_logged');
        invalidate();
      },
    }),
    unlog: useMutation({
      mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
        clearHabitLog(habitId, date),
      onSuccess: invalidate,
    }),
  };
}
