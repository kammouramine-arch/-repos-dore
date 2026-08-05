import * as SecureStore from 'expo-secure-store';

import type { Logger } from '@/core/domain/ports/logger';

/**
 * Credential-grade local persistence, backed by the iOS keychain and the
 * Android keystore. Everything identity-related goes through here — never
 * through the key-value store.
 *
 * Failures are logged without their payload: the whole point of this store is
 * that its contents never reach a log line.
 */
export interface SecureStorage {
  readJson<T>(key: string, fallback: T): Promise<T>;
  writeJson(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export const createSecureStore = (logger: Logger): SecureStorage => {
  const scoped = logger.scoped('storage.secure');

  return {
    async readJson<T>(key: string, fallback: T): Promise<T> {
      try {
        const raw = await SecureStore.getItemAsync(key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
      } catch {
        scoped.warn('unreadable secure record, using fallback', { key });
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
};
