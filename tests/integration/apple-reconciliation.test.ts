import { afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestOrganization, cleanupOrganization, prisma } from '../helpers';
const m = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock('@apple/app-store-server-library', () => ({
  Environment: { PRODUCTION: 'Production', SANDBOX: 'Sandbox' },
  SignedDataVerifier: class { verifyAndDecodeTransaction = m.decode; },
}));
import { syncAppleTransaction } from '@/server/services/appleBillingService';
import { buildSessionDTOFor } from '@/server/services/sessionDto';
const created: Awaited<ReturnType<typeof createTestOrganization>>[] = [];
afterAll(async () => { for (const o of created) await cleanupOrganization(o.organization.id, o.user.id); await prisma.$disconnect(); });
describe('Apple reconciliation against isolated PostgreSQL', () => {
  it('persists access, recalculates app nextStep, and refuses a second workspace safely', async () => {
    const a = await createTestOrganization('Apple A'); created.push(a);
    const b = await createTestOrganization('Apple B'); created.push(b);
    await prisma.user.update({ where: { id: a.user.id }, data: { emailVerifiedAt: new Date() } });
    await prisma.subscription.update({ where: { organizationId: a.organization.id }, data: { status: 'incomplete' } });
    expect((await buildSessionDTOFor(a.user.id, a.organization.id)).nextStep).toBe('subscription');
    const t = { appAccountToken: a.organization.id, productId: 'fr.devisia.essentiel.monthly', originalTransactionId: randomUUID(), type: 'Auto-Renewable Subscription', environment: 'Sandbox', signedDate: Date.now(), expiresDate: Date.now() + 300_000 };
    m.decode.mockResolvedValue(t);
    await syncAppleTransaction('test-signed', a.organization.id);
    const session = await buildSessionDTOFor(a.user.id, a.organization.id);
    expect(session.nextStep).toBe('app'); expect(session.access.canWrite).toBe(true);
    await expect(syncAppleTransaction('test-signed', a.organization.id)).resolves.toEqual({ synced: false });
    m.decode.mockResolvedValue({ ...t, appAccountToken: b.organization.id, signedDate: Date.now() + 1 });
    await expect(syncAppleTransaction('test-signed', b.organization.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await prisma.subscription.findUnique({ where: { organizationId: b.organization.id } }))?.appleOriginalTransactionId).toBeNull();
    // A later Apple token must not orphan the original owner either.
    await prisma.subscription.update({ where: { organizationId: a.organization.id }, data: { status: 'canceled' } });
    await syncAppleTransaction('test-signed', a.organization.id);
    expect((await buildSessionDTOFor(a.user.id, a.organization.id)).nextStep).toBe('app');
  });
});
