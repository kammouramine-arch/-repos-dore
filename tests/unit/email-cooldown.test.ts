import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { emailRetrySeconds } from '@/server/services/accountService';
import { AppError } from '@/lib/errors';
import { fail } from '@/server/api';
import { DevisiaApiError } from '@devisia/shared';

describe('server-authoritative resend deadlines', () => {
  const now = new Date('2026-09-09T12:00:00Z');
  it('returns the exact remaining seconds of the minute cooldown', () => {
    expect(emailRetrySeconds({ sentAt: new Date(+now - 18_000), windowStart: now, sendCount: 1 }, now)).toBe(42);
  });
  it('uses the real hourly reset, not another fixed minute', () => {
    expect(emailRetrySeconds({ sentAt: new Date(+now - 120_000), windowStart: new Date(+now - 600_000), sendCount: 5 }, now)).toBe(3000);
  });
  it('expires at zero and handles a missing challenge', () => {
    expect(emailRetrySeconds(null, now)).toBe(0);
    expect(emailRetrySeconds({ sentAt: new Date(+now - 60_000), windowStart: new Date(+now - 3_600_000), sendCount: 5 }, now)).toBe(0);
  });
  it('transports the deadline through JSON, Retry-After and the mobile error', async () => {
    const response = fail(new AppError('RATE_LIMITED', undefined, { retryAfterSeconds: 42 }));
    expect(response.headers.get('Retry-After')).toBe('42');
    const body = await response.json();
    expect(new DevisiaApiError(body.error, 429).retryAfterSeconds).toBe(42);
  });
});
