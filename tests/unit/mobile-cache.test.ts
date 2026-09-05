import { beforeEach, describe, expect, it } from 'vitest';
import { cacheEpoch, clearQueryCache, invalidateQueryCache, readQueryCache, writeQueryCache } from '../../mobile/src/lib/query-cache';

describe('mobile display snapshots', () => {
  beforeEach(clearQueryCache);
  it('keeps different filters separate', () => {
    writeQueryCache('quotes:draft', ['draft'], cacheEpoch());
    writeQueryCache('quotes:sent', ['sent'], cacheEpoch());
    expect(readQueryCache('quotes:draft')?.data).toEqual(['draft']);
    expect(readQueryCache('quotes:sent')?.data).toEqual(['sent']);
  });
  it('keeps content visible but marks it stale after writes', () => {
    writeQueryCache('dashboard', { count: 3 }, cacheEpoch());
    invalidateQueryCache();
    expect(readQueryCache('dashboard')).toEqual({ data: { count: 3 }, at: 0 });
  });
  it('does not leak late responses across accounts', () => {
    const old = cacheEpoch();
    writeQueryCache('dashboard', 'old user', old);
    clearQueryCache();
    writeQueryCache('dashboard', 'late old response', old);
    expect(readQueryCache('dashboard')).toBeNull();
  });
  it('bounds memory use', () => {
    for (let i = 0; i < 50; i++) writeQueryCache(String(i), i, cacheEpoch());
    expect(readQueryCache('0')).toBeNull();
    expect(readQueryCache('49')?.data).toBe(49);
  });
});
