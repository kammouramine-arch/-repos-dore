import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestCustomer, createTestOrganization, prisma, sampleItems } from '../helpers';
import { assertCanWrite, getAccessState } from '@/server/services/accessService';
import { createQuote } from '@/server/services/quoteService';
import { registerDevice, unregisterDevice } from '@/server/services/notificationService';
import { TRIAL_DAYS } from '@devisia/shared';

let org: Awaited<ReturnType<typeof createTestOrganization>>;

beforeAll(async () => {
  org = await createTestOrganization('Abonnement');
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id, org.user.id);
  await prisma.$disconnect();
});

async function setSubscription(data: {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  trialEndsAt?: Date | null;
}) {
  await prisma.subscription.update({
    where: { organizationId: org.organization.id },
    data: { status: data.status, trialEndsAt: data.trialEndsAt ?? null },
  });
}

describe('droits d’accès selon l’abonnement', () => {
  it('autorise l’écriture pendant l’essai', async () => {
    await setSubscription({
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    });

    const state = await getAccessState(org.organization.id);
    expect(state.canWrite).toBe(true);
    expect(state.inTrial).toBe(true);
    await expect(assertCanWrite(org.organization.id)).resolves.toBeDefined();
  });

  it('bloque la création de devis quand l’essai est expiré', async () => {
    await setSubscription({ status: 'trialing', trialEndsAt: new Date(Date.now() - 60_000) });

    await expect(assertCanWrite(org.organization.id)).rejects.toThrowError(/essai gratuit est terminé/i);
  });

  it('laisse les données lisibles malgré l’essai expiré', async () => {
    const customer = await createTestCustomer(org.organization.id);

    // L'écriture est refusée par la garde, mais la lecture reste possible :
    // aucune donnée n'est supprimée ni rendue inaccessible.
    await setSubscription({ status: 'active' });
    const quote = await createQuote(org.organization.id, org.user.id, {
      customerId: customer.id,
      title: 'Devis créé avant expiration',
      items: sampleItems,
    });

    await setSubscription({ status: 'trialing', trialEndsAt: new Date(Date.now() - 60_000) });

    const stored = await prisma.quote.findFirst({
      where: { id: quote.id, organizationId: org.organization.id },
    });
    expect(stored).not.toBeNull();
    expect(stored?.totalCents).toBe(quote.totalCents);
  });

  it('rouvre l’écriture après souscription', async () => {
    await setSubscription({ status: 'active' });
    await expect(assertCanWrite(org.organization.id)).resolves.toBeDefined();
  });

  it('bloque l’écriture après résiliation effective', async () => {
    await setSubscription({ status: 'canceled' });
    await expect(assertCanWrite(org.organization.id)).rejects.toThrowError(/résilié/i);
    await setSubscription({ status: 'active' });
  });
});

describe('appareils de notification', () => {
  it('enregistre puis désenregistre un appareil', async () => {
    const token = 'ExponentPushToken[test-appareil-devisia]';

    await registerDevice({
      organizationId: org.organization.id,
      userId: org.user.id,
      token,
      platform: 'IOS',
      deviceName: 'iPhone de test',
    });

    const stored = await prisma.deviceToken.findUnique({ where: { token } });
    expect(stored?.organizationId).toBe(org.organization.id);
    expect(stored?.disabledAt).toBeNull();

    const removed = await unregisterDevice(org.organization.id, token);
    expect(removed).toBe(true);

    const disabled = await prisma.deviceToken.findUnique({ where: { token } });
    expect(disabled?.disabledAt).not.toBeNull();
  });

  it('n’expose pas les appareils d’une autre organisation', async () => {
    const other = await createTestOrganization('Concurrent push');
    const token = 'ExponentPushToken[autre-entreprise]';

    await registerDevice({
      organizationId: other.organization.id,
      userId: other.user.id,
      token,
      platform: 'ANDROID',
    });

    const removed = await unregisterDevice(org.organization.id, token);
    expect(removed).toBe(false);

    await cleanupOrganization(other.organization.id, other.user.id);
  });
});
