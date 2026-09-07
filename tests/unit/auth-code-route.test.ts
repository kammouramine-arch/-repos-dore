import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  confirmEmailCode: vi.fn(),
  requestEmailCode: vi.fn(),
  buildSessionDTO: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/server/services/accountService', () => ({
  confirmEmailCode: mocks.confirmEmailCode,
  normalizeEmailCode: (value: string) => value.normalize('NFKC').replace(/\s+/g, '').trim(),
  requestEmailCode: mocks.requestEmailCode,
}));
vi.mock('@/server/services/sessionDto', () => ({ buildSessionDTO: mocks.buildSessionDTO }));

import { PATCH } from '@/app/api/auth/code-email/route';

describe('email-code confirmation route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const auth = { user: { id: 'user-1' }, sessionId: 'session-1' };
    mocks.requireAuth.mockResolvedValue(auth);
    mocks.confirmEmailCode.mockResolvedValue({ verified: true });
    mocks.buildSessionDTO.mockResolvedValue({ nextStep: 'app', user: { id: 'user-1', emailVerified: true } });
  });

  it('normalizes the submitted code and returns a fresh post-verification session', async () => {
    const response = await PATCH(new Request('https://devisera.test/api/auth/code-email', {
      method: 'PATCH',
      body: JSON.stringify({ code: ' ００１２０４ ' }),
      headers: { 'content-type': 'application/json' },
    }));
    expect(response.status).toBe(200);
    expect(mocks.confirmEmailCode).toHaveBeenCalledWith('user-1', 'session-1', '001204');
    expect(mocks.requireAuth).toHaveBeenCalledTimes(2);
    expect(mocks.buildSessionDTO).toHaveBeenCalledWith(expect.objectContaining({ user: { id: 'user-1' } }));
    await expect(response.json()).resolves.toEqual({ data: { verified: true, session: { nextStep: 'app', user: { id: 'user-1', emailVerified: true } } } });
  });

  it('rejects a code that is not six digits before touching the verifier', async () => {
    const response = await PATCH(new Request('https://devisera.test/api/auth/code-email', {
      method: 'PATCH',
      body: JSON.stringify({ code: '1234' }),
      headers: { 'content-type': 'application/json' },
    }));
    expect(response.status).toBe(422);
    expect(mocks.confirmEmailCode).not.toHaveBeenCalled();
  });
});
