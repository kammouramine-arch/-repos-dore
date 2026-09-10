import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { acceptInvitation, invitationPreview, teamOverview } from '@/server/services/teamService';
import type { AuthContext } from '@/lib/auth/session';

let org: Awaited<ReturnType<typeof createTestOrganization>>;
let invitedUser: { id: string; email: string };

function ownerAuth(): AuthContext {
  return {
    user: { id: org.user.id, email: org.user.email, firstName: org.user.firstName, lastName: org.user.lastName, locale: 'fr', emailVerified: true, isPlatformAdmin: false },
    organization: { organizationId: org.organization.id, organizationName: org.organization.name, organizationSlug: org.organization.slug, role: 'OWNER' },
    memberships: [],
    sessionId: randomUUID(),
  };
}

beforeAll(async () => {
  org = await createTestOrganization('Équipe');
  invitedUser = await prisma.user.create({ data: { email: `invite-${randomUUID().slice(0, 8)}@devisera.test`, passwordHash: 'hash-de-test', firstName: 'Membre', lastName: 'Test' } });
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id, org.user.id);
  await prisma.user.delete({ where: { id: invitedUser.id } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe('team invitations', () => {
  it('prévisualise puis accepte une invitation une seule fois', async () => {
    const token = generateToken(32);
    const invitation = await prisma.teamInvitation.create({ data: { organizationId: org.organization.id, email: invitedUser.email, role: 'MEMBER', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 86_400_000), invitedById: org.user.id } });
    const preview = await invitationPreview(token);
    expect(preview.organizationId).toBe(org.organization.id);
    expect(preview.email).toBe(invitedUser.email);

    const accepted = await acceptInvitation({ ...ownerAuth(), user: { ...ownerAuth().user, id: invitedUser.id, email: invitedUser.email } }, token);
    expect(accepted.organizationId).toBe(org.organization.id);
    await expect(acceptInvitation({ ...ownerAuth(), user: { ...ownerAuth().user, id: invitedUser.id, email: invitedUser.email } }, token)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await teamOverview(org.organization.id)).usedSeats).toBe(2);
    await prisma.teamInvitation.delete({ where: { id: invitation.id } });
  });

  it('bloque l’acceptation d’un nouveau membre après un downgrade Essentiel', async () => {
    await prisma.organizationMember.update({ where: { organizationId_userId: { organizationId: org.organization.id, userId: invitedUser.id } }, data: { deletedAt: new Date() } });
    await prisma.subscription.update({ where: { organizationId: org.organization.id }, data: { plan: 'ESSENTIEL' } });
    const token = generateToken(32);
    const invitation = await prisma.teamInvitation.create({ data: { organizationId: org.organization.id, email: invitedUser.email, role: 'MEMBER', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 86_400_000), invitedById: org.user.id } });
    await expect(acceptInvitation({ ...ownerAuth(), user: { ...ownerAuth().user, id: invitedUser.id, email: invitedUser.email } }, token)).rejects.toMatchObject({ code: 'PLAN_LIMIT' });
    await prisma.teamInvitation.delete({ where: { id: invitation.id } });
  });
});
