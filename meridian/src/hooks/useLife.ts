import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cache';
import { createArea, fetchAreas, fetchLifeProgress, updateArea } from '@/services/areas';
import { fetchActiveLifePlan, fetchLifePlanItems, toggleLifePlanItem } from '@/services/plans';
import { fetchReflections } from '@/services/reflections';
import type { LifeArea } from '@/types/database';
import { useCachedQuery } from './useCachedQuery';

export function useAreas() {
  return useCachedQuery(['areas'], cacheKeys.areas, fetchAreas);
}

export function useLifeProgress() {
  return useCachedQuery(['progress'], cacheKeys.progress, fetchLifeProgress);
}

export function useLifePlan() {
  return useCachedQuery(['life-plan'], 'life-plan', fetchActiveLifePlan);
}

export function useLifePlanItems(lifePlanId?: string) {
  return useCachedQuery(
    ['life-plan-items', lifePlanId ?? 'none'],
    `life-plan-items.${lifePlanId ?? 'none'}`,
    () => (lifePlanId ? fetchLifePlanItems(lifePlanId) : Promise.resolve([])),
    { enabled: Boolean(lifePlanId) },
  );
}

export function useReflections(limit = 30) {
  return useCachedQuery(['reflections', limit], 'reflections', () => fetchReflections(limit));
}

export function useAreaActions() {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['areas'] });
    void client.invalidateQueries({ queryKey: ['progress'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: Partial<LifeArea>) => createArea(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<LifeArea> }) => updateArea(id, patch),
      onSuccess: invalidate,
    }),
    toggleItem: useMutation({
      mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleLifePlanItem(id, done),
      onSuccess: () => client.invalidateQueries({ queryKey: ['life-plan-items'] }),
    }),
  };
}
