/** Account-scoped, memory-only snapshots. Never persisted to disk. */
const entries = new Map<string, { data: unknown; at: number }>();
let epoch = 0;
export function cacheEpoch() { return epoch; }
export function clearQueryCache() { epoch += 1; entries.clear(); }
export function invalidateQueryCache() {
  for (const value of entries.values()) value.at = 0;
}
export function readQueryCache<T>(key?: string): { data: T; at: number } | null {
  if (!key) return null;
  const value = entries.get(key);
  return value ? value as { data: T; at: number } : null;
}
export function writeQueryCache(key: string | undefined, data: unknown, requestEpoch: number) {
  if (!key || requestEpoch !== epoch) return;
  entries.delete(key);
  entries.set(key, { data, at: Date.now() });
  if (entries.size > 30) entries.delete(entries.keys().next().value!);
}
