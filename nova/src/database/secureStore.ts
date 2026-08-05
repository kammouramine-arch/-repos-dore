import * as SecureStore from 'expo-secure-store';

/**
 * Credential-grade local persistence, backed by the iOS keychain and the
 * Android keystore. Everything identity-related goes through here — never
 * through {@link keyValueStore}.
 */
export const secureStore = {
  async readJson<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await SecureStore.getItemAsync(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },

  async writeJson(key: string, value: unknown): Promise<void> {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
