import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { handleStripeEvent } from '@/server/services/billingService';
import { assertWithinPlan, incrementUsage, usageSummary } from '@/server/services/usageService';
import { PLANS } from '@/lib/billing/plans';

let org: Awaited<ReturnType<typeof createTestOrganization>>;

beforeAll(async () => {
  org = await createTestOrganization('Facturation');
});

afterAll(async () => {
  await prisma.webhookEvent.deleteMany({ where: { provider: 'stripe' } });
  await cleanupOrganization(org.organization.id, org.user.id);
  await prisma.$disconnect();
});

function checkoutEvent(id: string, organizationId: string): Stripe.Event {
  return {
    id,
    object: 'event',
    type: 'checkout.session.completed',
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: 'cs_test_123',
        object: 'checkout.session',
        subscription: 'sub_test_123',
        customer: 'cus_test_123',
        metadata: { organizationId, plan: 'PRO' },
      },
    },
  } as unknown as Stripe.Event;
}

describe('webhooks Stripe', () => {
  it('active l’abonnement à partir de l’événement Stripe, jamais du frontend', async () => {
    const result = await handleStripeEvent(checkoutEvent('evt_test_1', org.organization.id));
    expect(result.skipped).toBe(false);

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: org.organization.id },
    });
    expect(subscription?.status).toBe('active');
    expect(subscription?.plan).toBe('PRO');
    expect(subscription?.stripeSubscriptionId).toBe('sub_test_123');
  });

  it('ignore un événement déjà traité (idempotence)', async () => {
    const replay = await handleStripeEvent(checkoutEvent('evt_test_1', org.organization.id));
    expect(replay.skipped).toBe(true);

    const stored = await prisma.webhookEvent.findMany({ where: { externalId: 'evt_test_1' } });
    expect(stored).toHaveLength(1);
  });

  it('bascule en past_due sur échec de paiement', async () => {
    await prisma.subscription.update({
      where: { organizationId: org.organization.id },
      data: { stripeCustomerId: 'cus_test_123' },
    });

    await handleStripeEvent({
      id: 'evt_test_2',
      object: 'event',
      type: 'invoice.payment_failed',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: null,
      api_version: null,
      data: { object: { id: 'in_1', object: 'invoice', customer: 'cus_test_123' } },
    } as unknown as Stripe.Event);

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: org.organization.id },
    });
    expect(subscription?.status).toBe('past_due');
  });
});

describe('limites de formule', () => {
  it('bloque au-delà du quota mensuel de la formule Essentiel', async () => {
    const limit = PLANS.ESSENTIEL.limits.aiGenerations!;
    await incrementUsage(org.organization.id, 'AI_GENERATION', limit);

    await expect(
      assertWithinPlan(org.organization.id, 'ESSENTIEL', 'AI_GENERATION'),
    ).rejects.toThrowError(/limite mensuelle/i);
  });

  it('laisse passer les formules sans limite', async () => {
    await expect(
      assertWithinPlan(org.organization.id, 'ENTREPRISE', 'AI_GENERATION'),
    ).resolves.toBeUndefined();
  });

  it('résume la consommation du mois', async () => {
    const summary = await usageSummary(org.organization.id, 'PRO');
    expect(summary.aiGenerations.used).toBeGreaterThan(0);
    expect(summary.aiGenerations.limit).toBe(PLANS.PRO.limits.aiGenerations);
    expect(summary.period).toMatch(/^\d{4}-\d{2}$/);
  });
});
