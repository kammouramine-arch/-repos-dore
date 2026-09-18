import { describe, expect, it } from 'vitest';
import { retrySeconds } from '@/lib/retry-seconds';
describe('verification cooldown delays', () => {
  it('uses exact server delay including hourly quota', () => {
    expect(retrySeconds(42, '60')).toBe(42);
    expect(retrySeconds(2541, null)).toBe(2541);
    expect(retrySeconds(0, '60')).toBe(0);
  });
  it('uses Retry-After when body delay is absent or invalid', () => {
    expect(retrySeconds(undefined, '39')).toBe(39);
    expect(retrySeconds(-1, '39')).toBe(39);
  });
  it('rejects non-finite, unrelated and malformed values', () => {
    for (const value of [Infinity, NaN, {}, true, 'secret', 'Infinity', -2]) expect(retrySeconds(value, null)).toBe(0);
  });
});
