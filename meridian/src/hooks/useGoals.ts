import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cache';
import {
  createGoal,
  createMilestone,
  deleteGoal,
  fetchGoal,
  fetchGoals,
  fetchMilestones,
  toggleMilestone,
  updateGoal,
} from '@/services/goals';
import { fetchTasksForGoal } from '@/services/tasks';
import type { Goal, GoalMilestone } from '@/types/database';
import { track } from '@/services/analytics';
import { useCachedQuery } from './useCachedQuery';

export function useGoals(status?: Goal['status'] | 'all') {
  return useCachedQuery(['goals', status ?? 'all'], `${cacheKeys.goals}.${status ?? 'all'}`, () =>
    fetchGoals(status),
  );
}

export function useGoal(id: string) {
  return useCachedQuery(['goal', id], `goal.${id}`, () => fetchGoal(id));
}

export function useGoalMilestones(goalId: string) {
  return useCachedQuery(['goal-milestones', goalId], `goal-milestones.${goalId}`, () =>
    fetchMilestones(goalId),
  );
}

export function useGoalTasks(goalId: string) {
  return useCachedQuery(['goal-tasks', goalId], `goal-tasks.${goalId}`, () =>
    fetchTasksForGoal(goalId),
  );
}

export function useGoalActions() {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['goals'] });
    void client.invalidateQueries({ queryKey: ['goal'] });
    void client.invalidateQueries({ queryKey: ['goal-milestones'] });
    void client.invalidateQueries({ queryKey: ['progress'] });
  };

  return {
    create: useMutation({
      mutationFn: (input: Partial<Goal>) => createGoal(input),
      onSuccess: () => {
        track('goal_created');
        invalidate();
      },
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<Goal> }) => updateGoal(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteGoal(id), onSuccess: invalidate }),
    addMilestone: useMutation({
      mutationFn: (input: Partial<GoalMilestone>) => createMilestone(input),
      onSuccess: invalidate,
    }),
    toggleMilestone: useMutation({
      mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleMilestone(id, done),
      onSuccess: invalidate,
    }),
  };
}
