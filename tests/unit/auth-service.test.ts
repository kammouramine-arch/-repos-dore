import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  membership: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  requestEmailCode: vi.fn(),
  createOrganization: vi.fn(),
  getEmailProvider: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findUnique: mocks.findUnique, findUniqueOrThrow: mocks.findUniqueOrThrow, create: mocks.create, update: mocks.update },
  organizationMember: { findFirst: mocks.membership },
} }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: mocks.hashPassword, verifyPassword: mocks.verifyPassword }));
vi.mock('@/server/services/accountService', () => ({ requestEmailCode: mocks.requestEmailCode }));
vi.mock('@/server/services/organizationService', () => ({ createOrganization: mocks.createOrganization }));
vi.mock('@/server/services/auditService', () => ({ recordAudit: vi.fn() }));
vi.mock('@/server/services/analyticsService', () => ({ trackEvent: vi.fn() }));
vi.mock('@/server/services/teamService', () => ({ acceptInvitationForNewUser: vi.fn(), invitationPreview: vi.fn() }));
vi.mock('@/lib/email', () => ({ getEmailProvider: mocks.getEmailProvider, resetPasswordEmail: vi.fn(), verifyEmailTemplate: vi.fn(), welcomeEmail: vi.fn(() => ({ subject: 'Welcome', text: 'Welcome', html: '<p>Welcome</p>' })) }));

import { signIn, signUp } from '@/server/services/authService';

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
  mocks.findUniqueOrThrow.mockResolvedValue({ id: 'user-1' });
  mocks.update.mockResolvedValue({});
  mocks.membership.mockResolvedValue({ organizationId: 'org-1', organization: { id: 'org-1', deletedAt: null } });
  mocks.hashPassword.mockResolvedValue('hashed-password');
  mocks.createOrganization.mockResolvedValue({ id: 'org-1', name: 'Atelier Test', deletedAt: null });
  mocks.create.mockResolvedValue({ id: 'user-new', email: input.email, emailVerifiedAt: null, deletedAt: null });
  mocks.getEmailProvider.mockReturnValue({ send: vi.fn().mockResolvedValue({ delivered: true }) });
});

describe('signup state machine', () => {
  it('creates a new account and requests a verification code exactly once', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(signUp(input)).resolves.toMatchObject({ user: expect.objectContaining({ email: input.email }), organization: { id: 'org-1' } });
    expect(mocks.requestEmailCode).toHaveBeenCalledTimes(1);
    expect(mocks.requestEmailCode).toHaveBeenCalledWith(expect.any(String), { email: input.email, language: 'en' });
  });

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

describe('sign-in state machine', () => {
  const authenticatedUser = {
    id: 'user-2', email: 'existing@example.test', passwordHash: 'hash',
    emailVerifiedAt: new Date(), deletedAt: null,
  };

  it('authenticates a verified account without sending a verification code', async () => {
    mocks.findUnique.mockResolvedValue(authenticatedUser);
    await expect(signIn({ email: authenticatedUser.email, password: 'correct' })).resolves.toMatchObject({ user: authenticatedUser, organizationId: 'org-1' });
    expect(mocks.requestEmailCode).not.toHaveBeenCalled();
  });

  it('authenticates an unverified account without sending a code; the client routes it to verification', async () => {
    const pending = { ...authenticatedUser, emailVerifiedAt: null };
    mocks.findUnique.mockResolvedValue(pending);
    await expect(signIn({ email: pending.email, password: 'correct' })).resolves.toMatchObject({ user: pending, organizationId: 'org-1' });
    expect(mocks.requestEmailCode).not.toHaveBeenCalled();
  });

  it('rejects a wrong password before any verification routing can occur', async () => {
    mocks.findUnique.mockResolvedValue(authenticatedUser);
    mocks.verifyPassword.mockResolvedValue(false);
    await expect(signIn({ email: authenticatedUser.email, password: 'wrong' })).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(mocks.membership).not.toHaveBeenCalled();
    expect(mocks.requestEmailCode).not.toHaveBeenCalled();
  });
});
