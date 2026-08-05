import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Logger } from '@/core/domain/ports/logger';

/**
 * Non-sensitive local persistence (preferences, recent destinations, flags).
 *
 * Reads never throw: a corrupted or half-written record falls back to the
 * caller's default rather than taking the launch sequence down with it. It is
 * logged rather than swallowed, so a device that consistently cannot read its
 * own records is visible instead of merely quiet.
 */
export interface KeyValueStore {
  readJson<T>(key: string, fallback: T): Promise<T>;
  writeJson(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export const createKeyValueStore = (logger: Logger): KeyValueStore => {
  const scoped = logger.scoped('storage.kv');

  return {
    async readJson<T>(key: string, fallback: T): Promise<T> {
      try {
        const raw = await AsyncStorage.getItem(key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
      } catch (error) {
        scoped.warn('unreadable record, using fallback', { key });
        scoped.debug('read failure detail', { key, error: String(error) });
        return fallback;
      }
    },

    async writeJson(key: string, value: unknown): Promise<void> {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },

    async remove(key: string): Promise<void> {
      await AsyncStorage.removeItem(key);
    },
  };
};
