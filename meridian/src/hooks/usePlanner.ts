import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cache';
import { enqueue } from '@/lib/outbox';
import { createTask, deleteTask, fetchTasksForDate, fetchTasksInRange, fetchUnscheduledTasks, rescheduleTask, setTaskDone, updateTask } from '@/services/tasks';
import { fetchEventsInRange } from '@/services/events';
import { fetchDailyPlan, fetchWeeklyPlan } from '@/services/plans';
import type { Task } from '@/types/database';
import { todayISO, weekRange, weekStartISO } from '@/utils/date';
import { useConnectivity } from '@/state/ConnectivityProvider';
import { track } from '@/services/analytics';
import { useCachedQuery } from './useCachedQuery';

export function useTasksForDate(date: string = todayISO()) {
  return useCachedQuery(['tasks', date], `${cacheKeys.today}.${date}`, () => fetchTasksForDate(date));
}

export function useEventsForDate(date: string = todayISO()) {
  return useCachedQuery(['events', date], `events.${date}`, () => fetchEventsInRange(date, date));
}

export function useDailyPlan(date: string = todayISO()) {
  return useCachedQuery(['daily-plan', date], `${cacheKeys.dailyPlan}.${date}`, () =>
    fetchDailyPlan(date),
  );
}

export function useWeek(weekStart: string = weekStartISO()) {
  const { end } = weekRange(new Date(`${weekStart}T00:00:00`));
  const tasks = useCachedQuery(['tasks-week', weekStart], `${cacheKeys.week}.${weekStart}`, () =>
    fetchTasksInRange(weekStart, end),
  );
  const events = useCachedQuery(['events-week', weekStart], `events-week.${weekStart}`, () =>
    fetchEventsInRange(weekStart, end),
  );
  const plan = useCachedQuery(['weekly-plan', weekStart], `weekly-plan.${weekStart}`, () =>
    fetchWeeklyPlan(weekStart),
  );
  return { tasks, events, plan, weekStart, weekEnd: end };
}

export function useUnscheduledTasks() {
  return useCachedQuery(['tasks-unscheduled'], 'tasks-unscheduled', fetchUnscheduledTasks);
}

/**
 * Task mutations with optimistic updates. When the device is offline the change is
 * applied locally and queued — it is never silently dropped, and the pending count is
 * visible in the UI.
 */
export function useTaskActions(date: string = todayISO()) {
  const client = useQueryClient();
  const { online, refreshPending } = useConnectivity();

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['tasks'] });
    void client.invalidateQueries({ queryKey: ['tasks-week'] });
    void client.invalidateQueries({ queryKey: ['daily-plan'] });
    void client.invalidateQueries({ queryKey: ['progress'] });
    void client.invalidateQueries({ queryKey: ['goals'] });
  };

  const optimistic = (id: string, patch: Partial<Task>) => {
    client.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
      old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    client.setQueriesData<Task[]>({ queryKey: ['tasks-week'] }, (old) =>
      old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  };

  const complete = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      optimistic(id, { status: done ? 'done' : 'todo' });
      if (!online) {
        await enqueue(done ? 'task.complete' : 'task.reopen', { id });
        await refreshPending();
        return;
      }
      await setTaskDone(id, done);
    },
    onSuccess: (_data, variables) => {
      if (variables.done) track('task_completed');
      invalidate();
    },
    onError: invalidate,
  });

  const create = useMutation({
    mutationFn: async (input: Partial<Task>) => {
      if (!online) {
        await enqueue('task.create', { ...input, scheduled_date: input.scheduled_date ?? date });
        await refreshPending();
        return null;
      }
      return createTask({ ...input, scheduled_date: input.scheduled_date ?? date });
    },
    onSuccess: () => {
      track('task_created');
      invalidate();
    },
  });

  const reschedule = useMutation({
    mutationFn: async ({ id, to, time }: { id: string; to: string; time?: string | null }) => {
      optimistic(id, { scheduled_date: to });
      if (!online) {
        await enqueue('task.reschedule', { id, scheduled_date: to, scheduled_time: time ?? null });
        await refreshPending();
        return;
      }
      await rescheduleTask(id, to, time);
    },
    onSuccess: invalidate,
    onError: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) => updateTask(id, patch),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: invalidate,
  });

  return { complete, create, reschedule, update, remove };
}
