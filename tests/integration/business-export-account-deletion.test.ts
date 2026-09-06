import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestCustomer, createTestOrganization, prisma } from '../helpers';
import { hashPassword } from '@/lib/auth/password';
import { exportBusinessData } from '@/server/services/businessExportService';
import { deletePersonalAccount } from '@/server/services/accountService';

let org: Awaited<ReturnType<typeof createTestOrganization>>;
let successorOwnerId: string;
const password = 'T3st-password!';

beforeAll(async () => {
  org = await createTestOrganization('Export entreprise');
  await prisma.user.update({ where: { id: org.user.id }, data: { passwordHash: await hashPassword(password) } });
  const successor = await prisma.user.create({ data: { email: `successor-${org.organization.id}@devisera.test`, passwordHash: 'hash-de-test', firstName: 'Second', lastName: 'Owner' } });
  successorOwnerId = successor.id;
  await prisma.organizationMember.update({ where: { organizationId_userId: { organizationId: org.organization.id, userId: successor.id } }, data: { role: 'OWNER' } }).catch(async () => prisma.organizationMember.create({ data: { organizationId: org.organization.id, userId: successor.id, role: 'OWNER' } }));
  await createTestCustomer(org.organization.id, 'client-export@devisera.test');
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id, org.user.id);
  if (successorOwnerId) await prisma.user.delete({ where: { id: successorOwnerId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe('business export and account deletion', () => {
  it('exports business records without credentials or provider secrets', async () => {
    const data = await exportBusinessData(org.organization.id);
    expect(data.scope).toBe('business');
    expect(data.organization.customers).toHaveLength(1);
    expect(data).not.toHaveProperty('passwordHash');
    expect(data).not.toHaveProperty('sessions');
    expect(data).not.toHaveProperty('tokens');
  });

  it('requires confirmation and password, then revokes personal access', async () => {
    await expect(deletePersonalAccount(org.user.id, password, 'DELETE')).rejects.toMatchObject({ code: 'VALIDATION' });
    const result = await deletePersonalAccount(org.user.id, password, 'SUPPRIMER');
    expect(result).toEqual({ deleted: true, businessRecordsRetained: true });

    const deleted = await prisma.user.findUnique({ where: { id: org.user.id }, select: { email: true, firstName: true, lastName: true, deletedAt: true } });
    expect(deleted?.email).toBe(`deleted+${org.user.id}@invalid.devisia.local`);
    expect(deleted?.firstName).toBeNull();
    expect(deleted?.lastName).toBeNull();
    expect(deleted?.deletedAt).toBeInstanceOf(Date);
    const membership = await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: org.organization.id, userId: org.user.id } } });
    expect(membership?.deletedAt).toBeInstanceOf(Date);
  });
});
