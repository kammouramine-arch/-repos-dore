import { STORAGE_KEYS } from '@/config';
import type { SavedPlaceSlot } from '@/core/domain/entities/conversation';
import type { Place } from '@/core/domain/entities/place';
import type { SavedPlacesRepository } from '@/core/domain/ports/savedPlacesRepository';
import type { KeyValueStore } from '@/database/keyValueStore';

type SavedPlaces = Partial<Record<SavedPlaceSlot, Place>>;

/**
 * Home and work, stored on the device.
 *
 * A plain key-value record rather than a secure one, matching how recent
 * destinations are held today — and carrying the same open question, since a
 * home address is the most sensitive thing this app knows.
 */
export const createLocalSavedPlacesRepository = (
  store: KeyValueStore,
): SavedPlacesRepository => {
  const read = () => store.readJson<SavedPlaces>(STORAGE_KEYS.savedPlaces, {});

  return {
    async get(slot) {
      return (await read())[slot] ?? null;
    },

    async set(slot, place) {
      await store.writeJson(STORAGE_KEYS.savedPlaces, { ...(await read()), [slot]: place });
    },

    async clear(slot) {
      const saved = { ...(await read()) };
      delete saved[slot];
      await store.writeJson(STORAGE_KEYS.savedPlaces, saved);
    },
  };
};
