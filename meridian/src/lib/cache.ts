import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small JSON cache used to keep the app useful offline. Entries are namespaced by
 * user so switching accounts never surfaces someone else's data.
 */
const PREFIX = 'meridian.cache.v1';

type Entry<T> = { value: T; savedAt: number };

const scoped = (userId: string | null, key: string) => `${PREFIX}.${userId ?? 'anon'}.${key}`;

export async function readCache<T>(
  userId: string | null,
  key: string,
  maxAgeMs?: number,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(scoped(userId, key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (maxAgeMs && Date.now() - entry.savedAt > maxAgeMs) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function writeCache<T>(userId: string | null, key: string, value: T): Promise<void> {
  try {
    const entry: Entry<T> = { value, savedAt: Date.now() };
    await AsyncStorage.setItem(scoped(userId, key), JSON.stringify(entry));
  } catch {
    /* cache writes are best effort */
  }
}

export async function clearCache(userId: string | null): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(`${PREFIX}.${userId ?? 'anon'}.`));
  if (mine.length) await AsyncStorage.multiRemove(mine);
}

export async function clearAllCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(PREFIX));
  if (mine.length) await AsyncStorage.multiRemove(mine);
}

export const cacheKeys = {
  today: 'today',
  week: 'week',
  goals: 'goals',
  habits: 'habits',
  projects: 'projects',
  areas: 'areas',
  progress: 'progress',
  profile: 'profile',
  preferences: 'preferences',
  subscription: 'subscription',
  dailyPlan: 'daily-plan',
} as const;
