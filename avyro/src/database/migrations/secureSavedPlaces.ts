import { STORAGE_KEYS } from '@/config';
import type { KeyValueStore } from '@/database/keyValueStore';
import type { SecureStorage } from '@/database/secureStore';

/** Copy before removing the legacy record; a failed keychain write keeps it. */
export const migrateSavedPlaces = async (legacy: KeyValueStore, secure: SecureStorage): Promise<void> => {
  const previous = await legacy.readJson<Record<string, unknown> | null>(STORAGE_KEYS.savedPlaces, null);
  if (!previous) return;
  const current = await secure.readJson<Record<string, unknown>>(STORAGE_KEYS.savedPlaces, {});
  await secure.writeJson(STORAGE_KEYS.savedPlaces, { ...previous, ...current });
  await legacy.remove(STORAGE_KEYS.savedPlaces);
};
