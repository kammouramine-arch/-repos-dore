import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { handleConnectEvent } from '@/server/services/invoicePaymentWebhookService';
import { createInvoiceFromQuote, invoiceDetail, recordPayment } from '@/server/services/invoiceService';
import { signQuote } from '@/server/services/signatureService';
import { invalidateSignaturesIfChanged } from '@/server/services/signatureService';

/**
 * Cycle complet, contre une vraie base : un devis est signé par le client,
 * facturé, puis encaissé par webhook Stripe.
 *
 * Le point le plus important est l'idempotence : Stripe relivre ses événements
 * et un encaissement compté deux fois ferait passer une facture pour soldée
 * alors qu'elle ne l'est pas.
 */

let org: Awaited<ReturnType<typeof createTestOrganization>>;
let customerId: string;

const STROKE = 'M 10 200 L 300 120 L 600 260 L 900 140';

beforeAll(async () => {
  org = await createTestOrganization('Cycle facture');
  const customer = await prisma.customer.create({
    data: { organizationId: org.organization.id, firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.fr' },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await prisma.webhookEvent.deleteMany({ where: { provider: 'stripe_connect' } });
  await cleanupOrganization(org.organization.id, org.user.id);
  await prisma.$disconnect();
});

async function makeQuote(total = 120_000) {
  const quote = await prisma.quote.create({
    data: {
      organizationId: org.organization.id,
      customerId,
      number: `DEV-TEST-${randomUUID().slice(0, 6)}`,
      title: 'Remplacement du mitigeur',
      status: 'ENVOYE',
      publicToken: randomUUID().replace(/-/g, ''),
      subtotalCents: total, netSubtotalCents: total, totalCents: total, vatCents: 0,
      items: {
        create: [{
          label: 'Mitigeur', unit: 'u', quantity: 1, unitPriceCents: total,
          vatRate: 0, lineTotalCents: total, vatCents: 0, position: 0,
        }],
      },
    },
    include: { items: true },
  });
  return quote;
}

function intent(id: string, invoiceId: string, organizationId: string, amount: number): Stripe.Event {
  return {
    id: `evt_${id}`,
    object: 'event',
    type: 'payment_intent.succeeded',
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id,
        object: 'payment_intent',
        amount,
        amount_received: amount,
        currency: 'eur',
        status: 'succeeded',
        metadata: { devisiaInvoiceId: invoiceId, devisiaOrganizationId: organizationId },
      } as unknown as Stripe.PaymentIntent,
    },
  } as unknown as Stripe.Event;
}

describe('signature du devis', () => {
  it('passe le devis en accepté et enregistre le tracé', async () => {
    const quote = await makeQuote();
    const signature = await signQuote(quote.publicToken, {
      signerName: 'Jean Dupont', strokePath: STROKE, accepted: true,
    }, { ipAddress: '203.0.113.9', userAgent: 'test' });

    expect(signature.signerName).toBe('Jean Dupont');
    expect(signature.invalidatedAt).toBeNull();
    const fresh = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } });
    expect(fresh.status).toBe('ACCEPTE');
    expect(fresh.acceptedAt).not.toBeNull();
  });

  it('refuse une seconde signature', async () => {
    const quote = await makeQuote();
    await signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: STROKE, accepted: true });
    await expect(
      signQuote(quote.publicToken, { signerName: 'Quelqu’un', strokePath: STROKE, accepted: true }),
    ).rejects.toThrow();
  });

  it('refuse un tracé qui n’est pas un chemin', async () => {
    const quote = await makeQuote();
    await expect(
      signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: '<script>alert(1)</script>', accepted: true }),
    ).rejects.toThrow();
  });

  it('invalide la signature quand le montant du devis change', async () => {
    const quote = await makeQuote();
    await signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: STROKE, accepted: true });

    await prisma.quote.update({ where: { id: quote.id }, data: { totalCents: 150_000 } });
    const invalidated = await invalidateSignaturesIfChanged(quote.id);

    expect(invalidated).toBe(1);
    const fresh = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } });
    expect(fresh.status).toBe('MODIFICATION_DEMANDEE');
    expect(fresh.acceptedAt).toBeNull();
  });
});

describe('conversion en facture', () => {
  it('refuse un devis que le client n’a pas accepté', async () => {
    const quote = await makeQuote();
    await expect(
      createInvoiceFromQuote(org.organization.id, org.user.id, { quoteId: quote.id }),
    ).rejects.toThrow();
  });

  it('copie les lignes et refuse la double facturation', async () => {
    const quote = await makeQuote(90_000);
    await signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: STROKE, accepted: true });

    const invoice = await createInvoiceFromQuote(org.organization.id, org.user.id, { quoteId: quote.id });
    expect(invoice.items).toHaveLength(1);
    expect(invoice.totalCents).toBe(90_000);
    expect(invoice.balanceCents).toBe(90_000);
    expect(invoice.status).toBe('BROUILLON');

    await expect(
      createInvoiceFromQuote(org.organization.id, org.user.id, { quoteId: quote.id }),
    ).rejects.toThrow();
  });
});

describe('encaissement', () => {
  it('refuse un règlement supérieur au restant dû', async () => {
    const quote = await makeQuote(50_000);
    await signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: STROKE, accepted: true });
    const invoice = await createInvoiceFromQuote(org.organization.id, org.user.id, { quoteId: quote.id });

    await expect(
      recordPayment(org.organization.id, org.user.id, invoice.id, { amountCents: 60_000, method: 'VIREMENT' }),
    ).rejects.toThrow();
  });

  it('additionne les règlements partiels puis solde la facture', async () => {
    const quote = await makeQuote(80_000);
    await signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: STROKE, accepted: true });
    const invoice = await createInvoiceFromQuote(org.organization.id, org.user.id, { quoteId: quote.id });

    const half = await recordPayment(org.organization.id, org.user.id, invoice.id, { amountCents: 30_000, method: 'VIREMENT' });
    expect(half.paidCents).toBe(30_000);
    expect(half.status).toBe('PARTIELLE');

    const settled = await recordPayment(org.organization.id, org.user.id, invoice.id, { amountCents: 50_000, method: 'CHEQUE' });
    expect(settled.status).toBe('PAYEE');
    expect(settled.balanceCents).toBe(0);
  });

  it('ne compte qu’une fois un webhook relivré', async () => {
    const quote = await makeQuote(70_000);
    await signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: STROKE, accepted: true });
    const invoice = await createInvoiceFromQuote(org.organization.id, org.user.id, { quoteId: quote.id });

    const paymentIntentId = `pi_${randomUUID().slice(0, 10)}`;
    const first = await handleConnectEvent(intent(paymentIntentId, invoice.id, org.organization.id, 70_000));
    expect(first.skipped).toBe(false);

    const afterFirst = await invoiceDetail(org.organization.id, invoice.id);
    expect(afterFirst.paidCents).toBe(70_000);
    expect(afterFirst.status).toBe('PAYEE');

    // Même identifiant d'événement : Stripe relivre, rien ne doit changer.
    const replay = await handleConnectEvent(intent(paymentIntentId, invoice.id, org.organization.id, 70_000));
    expect(replay.skipped).toBe(true);

    // Événement différent, même intention de paiement : la contrainte
    // d'unicité sur la référence empêche un second encaissement.
    const other = intent(paymentIntentId, invoice.id, org.organization.id, 70_000);
    (other as { id: string }).id = `evt_${randomUUID().slice(0, 8)}`;
    await handleConnectEvent(other);

    const afterReplays = await invoiceDetail(org.organization.id, invoice.id);
    expect(afterReplays.paidCents).toBe(70_000);
    expect(afterReplays.payments.filter((p) => p.status === 'REUSSI')).toHaveLength(1);
  });

  it('n’encaisse rien sur un échec de paiement', async () => {
    const quote = await makeQuote(60_000);
    await signQuote(quote.publicToken, { signerName: 'Jean Dupont', strokePath: STROKE, accepted: true });
    const invoice = await createInvoiceFromQuote(org.organization.id, org.user.id, { quoteId: quote.id });

    const failed = intent(`pi_${randomUUID().slice(0, 10)}`, invoice.id, org.organization.id, 60_000);
    (failed as { type: string }).type = 'payment_intent.payment_failed';
    await handleConnectEvent(failed);

    const fresh = await invoiceDetail(org.organization.id, invoice.id);
    expect(fresh.paidCents).toBe(0);
    expect(fresh.balanceCents).toBe(60_000);
    expect(fresh.status).not.toBe('PAYEE');
  });
});
