import { describe, expect, it } from 'vitest';
import { decodeDashboardSnapshot } from '../../mobile/src/lib/dashboard-snapshot';

describe('dashboard display snapshot', () => {
  const raw = JSON.stringify({ token: 'login-a', at: 1000, data: { amount: 7800 } });
  it('restores data only for the exact login', () => {
    expect(decodeDashboardSnapshot(raw, 'login-a', 2000)).toEqual({ amount: 7800 });
    expect(decodeDashboardSnapshot(raw, 'login-b', 2000)).toBeNull();
  });
  it('expires after one day and rejects future timestamps', () => {
    expect(decodeDashboardSnapshot(raw, 'login-a', 86_401_001)).toBeNull();
    expect(decodeDashboardSnapshot(raw, 'login-a', 999)).toBeNull();
  });
  it('ignores missing, corrupt and unversioned data', () => {
    for (const invalid of [null, '{', 'null', '{}', '{"token":"login-a","data":{}}']) {
      expect(decodeDashboardSnapshot(invalid, 'login-a', 2000)).toBeNull();
    }
  });
});
