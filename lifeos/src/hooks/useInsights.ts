import { useMemo } from 'react';
import { useGoals } from './useGoals';
import { useHabitLogs, useHabits } from './useHabits';
import { useProjects } from './useProjects';
import { usePreferences } from './useProfile';
import { useEventsForDate, useWeek } from './usePlanner';
import { useCachedQuery } from './useCachedQuery';
import { fetchTasksInRange } from '@/services/tasks';
import { detectInsights, headlineInsight, type Insight } from '@/utils/insights';
import { addDays, todayISO, toISODate } from '@/utils/date';

/**
 * Proactive observations, computed on device from data the app already has. No AI
 * request, no allowance spent, and it still works with no connection.
 */
export function useInsights() {
  const today = todayISO();
  const goals = useGoals('active');
  const habits = useHabits();
  const habitLogs = useHabitLogs(21);
  const projects = useProjects('active');
  const preferences = usePreferences();
  const week = useWeek();
  const events = useEventsForDate(today);

  // Completions from the last month give the "when do you finish things" signal.
  const history = useCachedQuery(['tasks-history'], 'tasks-history', () =>
    fetchTasksInRange(toISODate(addDays(new Date(), -30)), toISODate(addDays(new Date(), 14))),
  );

  const insights = useMemo<Insight[]>(
    () =>
      detectInsights({
        today,
        goals: goals.data ?? [],
        tasks: [...(history.data ?? []), ...(week.tasks.data ?? [])].filter(
          (task, index, all) => all.findIndex((t) => t.id === task.id) === index,
        ),
        habits: habits.data ?? [],
        habitLogs: habitLogs.data ?? [],
        projects: projects.data ?? [],
        events: events.data ?? [],
        preferences: preferences.data ?? null,
      }),
    [
      today,
      goals.data,
      history.data,
      week.tasks.data,
      habits.data,
      habitLogs.data,
      projects.data,
      events.data,
      preferences.data,
    ],
  );

  return {
    insights,
    headline: headlineInsight(insights),
    isLoading: goals.isLoading || habits.isLoading || history.isLoading,
  };
}
