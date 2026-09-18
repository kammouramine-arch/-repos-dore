import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { exportPersonalAccount } from '@/server/services/personalExportService';
let org: Awaited<ReturnType<typeof createTestOrganization>>;
beforeAll(async () => { org = await createTestOrganization('Export privé'); });
afterAll(async () => { await cleanupOrganization(org.organization.id, org.user.id); await prisma.$disconnect(); });
describe('personal export', () => {
  it('returns only the requested account and allowlisted membership fields', async () => {
    const data = await exportPersonalAccount(org.user.id);
    expect(data.account.id).toBe(org.user.id);
    expect(data.account.memberships[0].organization.id).toBe(org.organization.id);
    expect(data.account).not.toHaveProperty('passwordHash');
    expect(data.account).not.toHaveProperty('sessions');
    expect(data.account).not.toHaveProperty('tokens');
    expect(data.account).not.toHaveProperty('emailChallenge');
    expect(data.scope).toBe('personal-account');
  });
  it('rejects nonexistent accounts', async () => {
    await expect(exportPersonalAccount('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
