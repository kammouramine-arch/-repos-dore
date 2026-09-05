import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashToken } from '@/lib/auth/tokens';
const mocks = vi.hoisted(() => ({
  user: { findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  emailChallenge: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  session: { updateMany: vi.fn() }, authToken: { updateMany: vi.fn() },
  lock: vi.fn(), send: vi.fn(), password: vi.fn(), provider: { name: 'resend', available: true },
}));
vi.mock('@/lib/prisma', () => ({ prisma: {
  ...mocks,
  $transaction: (fn: (tx: unknown) => unknown) => fn({ ...mocks, $queryRaw: mocks.lock }),
} }));
vi.mock('@/lib/auth/password', () => ({ verifyPassword: mocks.password }));
vi.mock('@/lib/email', () => ({ getEmailProvider: () => ({ ...mocks.provider, send: mocks.send }), layout: () => 'email', esc: (s: string) => s }));
import { confirmEmailCode, requestEmailCode, updateAccountName } from '@/server/services/accountService';

const user = { id: 'user', email: 'old@example.com', passwordHash: 'hash', deletedAt: null };
const code = '123456';
const challenge = () => ({ id: 'challenge', userId: 'user', email: 'new@example.com', tokenHash: hashToken(`challenge:user:new@example.com:${code}`), attempts: 0, expiresAt: new Date(Date.now() + 600_000), usedAt: null, sentAt: new Date(Date.now() - 120_000), windowStart: new Date(), sendCount: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provider.name = 'resend'; mocks.provider.available = true;
  mocks.user.findUniqueOrThrow.mockResolvedValue(user);
  mocks.user.findUnique.mockResolvedValue(null);
  mocks.emailChallenge.findUnique.mockResolvedValue(null);
  mocks.password.mockResolvedValue(true);
  mocks.send.mockResolvedValue({ delivered: true });
});

describe('account email codes', () => {
  it('does not create a challenge when sending is unconfigured', async () => {
    mocks.provider.name = 'console';
    await expect(requestEmailCode('user', { email: user.email })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(mocks.emailChallenge.upsert).not.toHaveBeenCalled();
  });
  it('requires password verification before a change of address', async () => {
    mocks.password.mockResolvedValue(false);
    await expect(requestEmailCode('user', { email: 'new@example.com', password: 'wrong' })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('sends a six-digit code without changing the login address', async () => {
    await requestEmailCode('user', { email: ' NEW@example.com ', password: 'valid' });
    expect(mocks.send.mock.calls[0][0]).toMatchObject({ to: 'new@example.com' });
    expect(mocks.send.mock.calls[0][0].text).toMatch(/\b\d{6}\b/);
    expect(mocks.user.update).not.toHaveBeenCalled();
    expect(mocks.lock).toHaveBeenCalled();
  });
  it('invalidates the code on delivery failure without updating the user', async () => {
    mocks.send.mockRejectedValue(new Error('provider failure'));
    await expect(requestEmailCode('user', { email: user.email })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(mocks.emailChallenge.updateMany).toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it.each([
    { ...challenge(), sentAt: new Date() },
    { ...challenge(), sendCount: 5 },
  ])('enforces persisted resend limits', async (previous) => {
    mocks.emailChallenge.findUnique.mockResolvedValue(previous);
    await expect(requestEmailCode('user', { email: user.email })).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('persists wrong attempts before returning an error', async () => {
    mocks.emailChallenge.findUnique.mockResolvedValue(challenge());
    await expect(confirmEmailCode('user', 'session', '000000')).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(mocks.emailChallenge.update).toHaveBeenCalledWith({ where: { userId: 'user' }, data: { attempts: { increment: 1 } } });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it.each([
    { ...challenge(), attempts: 5 },
    { ...challenge(), usedAt: new Date() },
    { ...challenge(), expiresAt: new Date(0) },
  ])('rejects exhausted, consumed or expired codes', async (record) => {
    mocks.emailChallenge.findUnique.mockResolvedValue(record);
    await expect(confirmEmailCode('user', 'session', code)).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it('confirms the address, consumes the code and revokes other sessions and old links', async () => {
    mocks.emailChallenge.findUnique.mockResolvedValue(challenge());
    await expect(confirmEmailCode('user', 'keep-session', code)).resolves.toEqual({ verified: true });
    expect(mocks.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { email: 'new@example.com', emailVerifiedAt: expect.any(Date) } }));
    expect(mocks.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user', id: { not: 'keep-session' }, revokedAt: null } }));
    expect(mocks.authToken.updateMany).toHaveBeenCalled();
  });
  it('does not take over another account with the same email', async () => {
    mocks.emailChallenge.findUnique.mockResolvedValue(challenge());
    mocks.user.findUnique.mockResolvedValue({ id: 'another-user' });
    await expect(confirmEmailCode('user', 'session', code)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it('updates names independently of email delivery', async () => {
    await updateAccountName('user', ' Amine ', ' Kammour ');
    expect(mocks.user.update).toHaveBeenCalledWith({ where: { id: 'user' }, data: { firstName: 'Amine', lastName: 'Kammour' } });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
