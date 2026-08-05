import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Non-sensitive local persistence (preferences, recent destinations, flags).
 *
 * Reads never throw: a corrupted or half-written record falls back to the
 * caller's default rather than taking the launch sequence down with it.
 */
export const keyValueStore = {
  async readJson<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
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
