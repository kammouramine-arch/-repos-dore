import { afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestOrganization, cleanupOrganization, prisma } from '../helpers';
vi.mock('@/lib/email', () => ({ getEmailProvider: () => ({ name: 'resend', available: true, send: vi.fn() }), layout: () => '', esc: (s: string) => s }));
import { emailCodeStatus, requestEmailCode } from '@/server/services/accountService';
let account: Awaited<ReturnType<typeof createTestOrganization>>;
afterAll(async () => { if (account) await cleanupOrganization(account.organization.id, account.user.id); await prisma.$disconnect(); });
describe('persisted email quota in isolated PostgreSQL', () => {
  it('restores hourly cooldown and rejects direct resend before provider dispatch', async () => {
    account = await createTestOrganization('Cooldown');
    const now = Date.now();
    await prisma.emailChallenge.create({ data: {
      id: randomUUID(), userId: account.user.id, email: account.user.email,
      tokenHash: 'not-a-real-code', expiresAt: new Date(now + 600_000),
      sentAt: new Date(now - 120_000), windowStart: new Date(now - 600_000), sendCount: 5,
    } });
    const status = await emailCodeStatus(account.user.id);
    expect(status.retryAfterSeconds).toBeGreaterThan(2990);
    expect(status.retryAfterSeconds).toBeLessThanOrEqual(3000);
    await expect(requestEmailCode(account.user.id, { email: account.user.email })).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: expect.any(Number) });
  });
});
