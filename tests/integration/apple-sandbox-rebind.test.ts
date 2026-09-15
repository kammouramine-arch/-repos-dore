import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import { prisma } from '@/lib/prisma';
import { sandboxRebindGrant } from '@/server/services/appleBillingService';
import { cleanupOrganization, createTestOrganization } from '../helpers';

/**
 * Autorisation de réconciliation Sandbox : ce que le serveur accepte, et
 * surtout ce qu'il refuse. La propriété la plus importante est l'usage
 * unique : une autorisation consommée ne doit jamais rouvrir l'exception.
 */
const TXN = `2000000900${Date.now()}`.slice(0, 18);
let target: Awaited<ReturnType<typeof createTestOrganization>>;
let grantId: string;

const transaction = (over: Partial<JWSTransactionDecodedPayload> = {}) =>
  ({ originalTransactionId: TXN, environment: 'Sandbox', productId: 'fr.devisia.pro.monthly', ...over }) as JWSTransactionDecodedPayload;

/** Exactement la consommation faite par `syncAppleTransaction`. */
const consume = () => prisma.appleSandboxRebindGrant.updateMany({ where: { id: grantId, usedAt: null }, data: { usedAt: new Date() } });

beforeAll(async () => {
  process.env.APPLE_ALLOW_SANDBOX = 'true';
  target = await createTestOrganization('Espace cible rebind');
  const grant = await prisma.appleSandboxRebindGrant.create({ data: {
    appleOriginalTransactionId: TXN,
    targetOrganizationId: target.organization.id,
    previousOrganizationId: null,
    approval: 'approbation-proprietaire-test-integration',
    provenance: 'test-integration-reconciliation-sandbox',
    expiresAt: new Date(Date.now() + 3_600_000),
  } });
  grantId = grant.id;
});

afterAll(async () => {
  await prisma.appleSandboxRebindGrant.deleteMany({ where: { appleOriginalTransactionId: TXN } });
  await cleanupOrganization(target.organization.id);
  delete process.env.APPLE_ALLOW_SANDBOX;
});

describe('autorisation de réconciliation Sandbox', () => {
  it('accepte une autorisation valide pour le bon espace', async () => {
    await expect(sandboxRebindGrant(transaction(), target.organization.id)).resolves.toMatchObject({ id: grantId });
  });

  it('refuse un autre espace que celui désigné', async () => {
    const other = await createTestOrganization('Espace tiers rebind');
    try {
      await expect(sandboxRebindGrant(transaction(), other.organization.id)).resolves.toBeNull();
    } finally {
      await cleanupOrganization(other.organization.id);
    }
  });

  it('refuse une transaction de Production, même avec une autorisation', async () => {
    await expect(sandboxRebindGrant(transaction({ environment: 'Production' }), target.organization.id)).resolves.toBeNull();
  });

  it('refuse quand le fournisseur n’accepte pas le bac à sable', async () => {
    process.env.APPLE_ALLOW_SANDBOX = 'false';
    try {
      await expect(sandboxRebindGrant(transaction(), target.organization.id)).resolves.toBeNull();
    } finally {
      process.env.APPLE_ALLOW_SANDBOX = 'true';
    }
  });

  it('se consomme une seule fois, puis n’autorise plus rien', async () => {
    // Première restauration réussie.
    expect((await consume()).count).toBe(1);
    // Une seconde tentative ne consomme rien : l'autorisation est épuisée.
    expect((await consume()).count).toBe(0);
    // Et le serveur refuse désormais l'exception pour cette transaction.
    await expect(sandboxRebindGrant(transaction(), target.organization.id)).resolves.toBeNull();
  });

  it('refuse une autorisation expirée', async () => {
    await prisma.appleSandboxRebindGrant.update({ where: { id: grantId }, data: { usedAt: null, expiresAt: new Date(Date.now() - 1000) } });
    await expect(sandboxRebindGrant(transaction(), target.organization.id)).resolves.toBeNull();
  });
});
