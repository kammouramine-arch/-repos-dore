import { STORAGE_KEYS } from '@/config';
import type { Place, RecentDestination } from '@/core/domain/entities/place';
import type { RecentDestinationsRepository } from '@/core/domain/ports/preferencesRepository';
import type { KeyValueStore } from '@/database/keyValueStore';

/** How many destinations the home screen keeps within reach. */
const MAX_ENTRIES = 8;

/**
 * Recent destinations, most recent first. Re-navigating to a place moves it
 * back to the top instead of creating a duplicate entry.
 */
export const createLocalRecentDestinationsRepository = (
  store: KeyValueStore,
): RecentDestinationsRepository => {
    const read = () =>
      store.readJson<RecentDestination[]>(STORAGE_KEYS.recentDestinations, []);

    return {
      async list(): Promise<RecentDestination[]> {
        const entries = await read();
        return [...entries].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
      },

      async add(place: Place): Promise<RecentDestination[]> {
        const entries = await read();
        const next = [
          { place, lastUsedAt: Date.now() },
          ...entries.filter((entry) => entry.place.id !== place.id),
        ].slice(0, MAX_ENTRIES);

        await store.writeJson(STORAGE_KEYS.recentDestinations, next);
        return next;
      },

      async clear(): Promise<void> {
        await store.remove(STORAGE_KEYS.recentDestinations);
      },
    };
  };
