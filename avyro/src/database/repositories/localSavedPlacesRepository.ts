import { STORAGE_KEYS } from '@/config';
import type { SavedPlaceSlot } from '@/core/domain/entities/conversation';
import type { Place } from '@/core/domain/entities/place';
import type { SavedPlacesRepository } from '@/core/domain/ports/savedPlacesRepository';
import type { SecureStorage } from '@/database/secureStore';

type SavedPlaces = Partial<Record<SavedPlaceSlot, Place>>;

/**
 * Home and work, stored on the device.
 *
 * Addresses use secure storage. Serialized updates keep simultaneous Home
 * and Work saves from replacing one another.
 */
export const createLocalSavedPlacesRepository = (
  store: SecureStorage,
): SavedPlacesRepository => {
  const read = () => store.readJson<SavedPlaces>(STORAGE_KEYS.savedPlaces, {});
  let mutations: Promise<void> = Promise.resolve();
  const mutate = (change: (saved: SavedPlaces) => SavedPlaces) => {
    const next = mutations.then(async () => store.writeJson(STORAGE_KEYS.savedPlaces, change(await read())));
    mutations = next.catch(() => undefined);
    return next;
  };

  return {
    async get(slot) {
      return (await read())[slot] ?? null;
    },

    set(slot, place) {
      return mutate((saved) => ({ ...saved, [slot]: place }));
    },

    clear(slot) {
      return mutate((saved) => { const next = { ...saved }; delete next[slot]; return next; });
    },
  };
};
