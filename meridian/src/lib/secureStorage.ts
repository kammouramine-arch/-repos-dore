import * as SecureStore from 'expo-secure-store';

/**
 * Supabase session storage backed by the device keychain / keystore.
 * SecureStore rejects values over ~2 KB, and a session with a long JWT can exceed
 * that, so values are chunked and reassembled transparently.
 */
const CHUNK = 1600;

const countKey = (key: string) => `${key}__chunks`;
const chunkKey = (key: string, i: number) => `${key}__${i}`;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const countRaw = await SecureStore.getItemAsync(countKey(key));
      if (!countRaw) return await SecureStore.getItemAsync(key);
      const count = Number(countRaw);
      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const count = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(countKey(key), String(count));
  },

  async removeItem(key: string): Promise<void> {
    try {
      const countRaw = await SecureStore.getItemAsync(countKey(key));
      if (countRaw) {
        const count = Number(countRaw);
        for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(chunkKey(key, i));
        await SecureStore.deleteItemAsync(countKey(key));
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* nothing to remove */
    }
  },
};
