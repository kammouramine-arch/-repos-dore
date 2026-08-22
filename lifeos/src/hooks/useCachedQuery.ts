import { useEffect, useState } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { readCache, writeCache } from '@/lib/cache';
import { useAuth } from '@/state/AuthProvider';

/**
 * A query that mirrors its result into on-device storage and falls back to that copy
 * when the network is unavailable. The effect is that plans, tasks, goals and habits
 * stay readable offline: the screen shows the last known state instead of a spinner
 * that never resolves or an error where the plan should be.
 */
export function useCachedQuery<T>(
  key: (string | number)[],
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: Partial<UseQueryOptions<T, Error, T, (string | number)[]>>,
) {
  const { userId } = useAuth();
  const [cached, setCached] = useState<T | undefined>(undefined);

  const query = useQuery<T, Error, T, (string | number)[]>({
    queryKey: [...key, userId ?? 'anon'],
    queryFn: fetcher,
    enabled: Boolean(userId) && (options?.enabled ?? true),
    ...options,
  });

  // Hydrate from disk once, so the first frame after a cold start already has content.
  useEffect(() => {
    let active = true;
    void readCache<T>(userId, cacheKey).then((value) => {
      if (active && value != null) setCached(value);
    });
    return () => {
      active = false;
    };
  }, [userId, cacheKey]);

  // Keep the on-device copy current whenever the server answers.
  useEffect(() => {
    if (query.isSuccess && query.data !== undefined) {
      void writeCache(userId, cacheKey, query.data);
    }
  }, [query.data, query.isSuccess, cacheKey, userId]);

  const data = query.data ?? cached;

  return {
    ...query,
    data,
    /** True only when there is nothing at all to show yet. */
    isLoading: query.isLoading && data === undefined,
    /** True when what is on screen came from the cache rather than the server. */
    isFromCache: query.data === undefined && cached !== undefined,
  };
}
