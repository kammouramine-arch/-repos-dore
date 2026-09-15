import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  identity: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  session: { updateMany: vi.fn() },
  authToken: { updateMany: vi.fn() },
  emailChallenge: { updateMany: vi.fn() },
  organizationMember: { findFirst: vi.fn() },
  organization: { findUnique: vi.fn(), update: vi.fn() },
  businessProfile: { update: vi.fn() },
  lock: vi.fn(),
  createOrganization: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const client = {
    authIdentity: mocks.identity,
    user: mocks.user,
    session: mocks.session,
    authToken: mocks.authToken,
    emailChallenge: mocks.emailChallenge,
    organizationMember: mocks.organizationMember,
    organization: mocks.organization,
    businessProfile: mocks.businessProfile,
    $queryRaw: mocks.lock,
  };
  return { prisma: { ...client, $transaction: (arg: unknown) => (typeof arg === 'function' ? arg(client) : Promise.all(arg as Promise<unknown>[])) } };
});
vi.mock('@/lib/env', () => ({ env: () => ({ AUTH_SECRET: 'test-secret-for-unit-tests' }) }));
vi.mock('@/server/services/organizationService', () => ({ createOrganization: mocks.createOrganization }));
vi.mock('@/server/services/auditService', () => ({ recordAudit: mocks.recordAudit }));
vi.mock('@/server/services/analyticsService', () => ({ trackEvent: vi.fn() }));

import { authenticateWithIdentity, completeIdentityOnboarding, provisionalBusinessName } from '@/server/services/identityService';

const apple = { provider: 'APPLE' as const, subject: 'apple-sub-1', email: 'karim@example.test', emailVerified: true, privateRelay: false, firstName: 'Karim', lastName: 'Benali' };
const relay = { ...apple, subject: 'apple-sub-2', email: 'abc123@privaterelay.appleid.com', privateRelay: true, firstName: null, lastName: null };
const membership = (organizationId = 'org-1') => ({ organizationId, role: 'OWNER', organization: { id: organizationId, deletedAt: null } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.identity.findUnique.mockResolvedValue(null);
  mocks.user.findUnique.mockResolvedValue(null);
  mocks.identity.update.mockResolvedValue({});
  mocks.identity.create.mockResolvedValue({});
  mocks.user.update.mockResolvedValue({});
  mocks.user.create.mockImplementation(async ({ data }: { data: { email: string; locale?: string } }) => ({ id: 'user-new', email: data.email, locale: data.locale ?? 'fr' }));
  mocks.createOrganization.mockResolvedValue({ id: 'org-new' });
  mocks.user.delete.mockResolvedValue({});
});

describe('identity authentication', () => {
  it('signs in a known identity without touching the email, even when the address changed', async () => {
    mocks.identity.findUnique.mockResolvedValue({ id: 'identity-1', userId: 'user-1', email: 'old@example.test', emailVerified: true, user: { id: 'user-1', email: 'account@example.test', locale: 'fr', deletedAt: null, memberships: [membership()] } });
    const result = await authenticateWithIdentity({ identity: { ...apple, email: 'new@example.test' }, ip: null });
    expect(result).toEqual({ user: { id: 'user-1', email: 'account@example.test', locale: 'fr' }, organizationId: 'org-1', outcome: 'signed_in' });
    expect(mocks.user.create).not.toHaveBeenCalled();
    expect(mocks.identity.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'identity-1' } }));
  });

  it('links a provider to an existing verified account with the same verified address, never creating a second account', async () => {
    mocks.user.findUnique.mockResolvedValue({ id: 'user-1', email: apple.email, locale: 'fr', deletedAt: null, emailVerifiedAt: new Date(), firstName: 'K', lastName: null, memberships: [membership()] });
    const result = await authenticateWithIdentity({ identity: apple });
    expect(result.outcome).toBe('linked');
    expect(result.organizationId).toBe('org-1');
    expect(mocks.identity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', provider: 'APPLE', providerUserId: 'apple-sub-1' }) }));
    expect(mocks.session.updateMany).not.toHaveBeenCalled();
    expect(mocks.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ passwordHash: null }) }));
  });

  it('claims an account that never verified its mailbox and revokes its old credentials and sessions', async () => {
    mocks.user.findUnique.mockResolvedValue({ id: 'user-1', email: apple.email, locale: 'fr', deletedAt: null, emailVerifiedAt: null, firstName: null, lastName: null, memberships: [membership()] });
    const result = await authenticateWithIdentity({ identity: apple });
    expect(result.outcome).toBe('claimed');
    expect(mocks.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passwordHash: null, emailVerifiedAt: expect.any(Date) }) }));
    expect(mocks.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }));
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.identity_claimed' }));
  });

  it('creates a password-less account with a business still to name for a first sign-in', async () => {
    const result = await authenticateWithIdentity({ identity: apple, locale: 'fr', billingProvider: 'apple' });
    expect(result.outcome).toBe('created');
    expect(mocks.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passwordHash: null, emailVerifiedAt: expect.any(Date), firstName: 'Karim' }) }));
    expect(mocks.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ setupPending: true, requireApplePurchase: true, name: 'Atelier de Karim Benali', email: apple.email }));
  });

  it('keeps an Apple private relay address off the business profile and out of the provisional name', async () => {
    await authenticateWithIdentity({ identity: relay });
    expect(mocks.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mon atelier', email: null }));
    expect(provisionalBusinessName(relay, relay.email)).toBe('Mon atelier');
    expect(provisionalBusinessName({ firstName: null, lastName: null, privateRelay: false }, 'sophie.lemoine@example.test')).toBe('Atelier de Sophie lemoine');
  });

  it('never links on an unverified provider address and never merges two existing accounts', async () => {
    const google = { ...apple, provider: 'GOOGLE' as const, subject: 'google-sub-1', emailVerified: false };
    mocks.user.findUnique.mockResolvedValue({ id: 'user-1', email: apple.email, deletedAt: null, emailVerifiedAt: new Date(), memberships: [membership()] });
    await expect(authenticateWithIdentity({ identity: google })).rejects.toThrow(/n’a pas confirmé/);
    expect(mocks.identity.create).not.toHaveBeenCalled();
    expect(mocks.user.create).not.toHaveBeenCalled();
  });

  it('starts over when the identity belonged to a deleted account', async () => {
    mocks.identity.findUnique.mockResolvedValue({ id: 'identity-old', userId: 'user-gone', user: { id: 'user-gone', deletedAt: new Date(), memberships: [] } });
    const result = await authenticateWithIdentity({ identity: apple });
    expect(mocks.identity.delete).toHaveBeenCalledWith({ where: { id: 'identity-old' } });
    expect(result.outcome).toBe('created');
  });

  it('rolls the user back when the organization cannot be created', async () => {
    mocks.createOrganization.mockRejectedValue(new Error('boom'));
    await expect(authenticateWithIdentity({ identity: apple })).rejects.toThrow('boom');
    expect(mocks.user.delete).toHaveBeenCalledWith({ where: { id: 'user-new' } });
  });
});

describe('identity onboarding', () => {
  it('names the business, records the owner and clears the flag for the owner only', async () => {
    mocks.organizationMember.findFirst.mockResolvedValue({ role: 'OWNER' });
    mocks.organization.findUnique.mockResolvedValue({ setupPending: true, deletedAt: null });
    mocks.user.update.mockResolvedValue({ firstName: 'Karim', lastName: 'Benali' });
    await completeIdentityOnboarding('user-1', 'org-1', { companyName: ' Plomberie Benali ', trade: 'PLOMBIER', phone: '0600000000' });
    expect(mocks.organization.update).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { name: 'Plomberie Benali', setupPending: false } });
    expect(mocks.businessProfile.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ legalName: 'Plomberie Benali', ownerName: 'Karim Benali', trade: 'PLOMBIER' }) }));
  });

  it('refuses to rename an organization that is already configured', async () => {
    mocks.organizationMember.findFirst.mockResolvedValue({ role: 'OWNER' });
    mocks.organization.findUnique.mockResolvedValue({ setupPending: false, deletedAt: null });
    await expect(completeIdentityOnboarding('user-1', 'org-1', { companyName: 'Autre nom' })).rejects.toThrow(/déjà configurée/);
  });
});
