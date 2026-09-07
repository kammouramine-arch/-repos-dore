import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  verifyPassword: vi.fn(),
  requestEmailCode: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: vi.fn(), verifyPassword: mocks.verifyPassword }));
vi.mock('@/server/services/accountService', () => ({ requestEmailCode: mocks.requestEmailCode }));
vi.mock('@/server/services/organizationService', () => ({ createOrganization: vi.fn() }));
vi.mock('@/server/services/auditService', () => ({ recordAudit: vi.fn() }));
vi.mock('@/server/services/analyticsService', () => ({ trackEvent: vi.fn() }));
vi.mock('@/server/services/teamService', () => ({ acceptInvitationForNewUser: vi.fn(), invitationPreview: vi.fn() }));
vi.mock('@/lib/email', () => ({ getEmailProvider: vi.fn(), resetPasswordEmail: vi.fn(), verifyEmailTemplate: vi.fn(), welcomeEmail: vi.fn() }));

import { signUp } from '@/server/services/authService';

const input = {
  email: 'pending@example.test',
  password: 'correct-password',
  companyName: 'Atelier Test',
  locale: 'en' as const,
  verificationMethod: 'code' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.requestEmailCode.mockResolvedValue({ requested: true });
});

describe('signup state machine', () => {
  it('reuses a matching pending account and requests a fresh code', async () => {
    const organization = { id: 'org-1', name: 'Atelier Test', deletedAt: null };
    const user = {
      id: 'user-1',
      email: input.email,
      passwordHash: 'hash',
      emailVerifiedAt: null,
      deletedAt: null,
      locale: 'fr',
      memberships: [{ organization }],
    };
    mocks.findUnique.mockResolvedValue(user);

    await expect(signUp(input)).resolves.toMatchObject({ existingPending: true, user, organization });
    expect(mocks.verifyPassword).toHaveBeenCalledWith(input.password, 'hash');
    expect(mocks.requestEmailCode).toHaveBeenCalledWith('user-1', { email: input.email, language: 'en' });
  });

  it('does not issue a verification session for a pending account with a wrong password', async () => {
    mocks.verifyPassword.mockResolvedValue(false);
    mocks.findUnique.mockResolvedValue({
      id: 'user-1',
      email: input.email,
      passwordHash: 'hash',
      emailVerifiedAt: null,
      deletedAt: null,
      memberships: [],
    });

    await expect(signUp(input)).rejects.toMatchObject({
      code: 'CONFLICT',
      details: { pendingVerification: ['true'] },
    });
    expect(mocks.requestEmailCode).not.toHaveBeenCalled();
  });
});
