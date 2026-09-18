import 'server-only';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { recomputeInvoiceTotals } from './invoiceService';
import { applyAccountState } from './paymentAccountService';
import { notify } from './notificationService';

/**
 * Webhooks Stripe Connect : encaissement des factures de l'artisan.
 *
 * Trois règles tiennent tout ce fichier.
 *
 * 1. L'état d'un paiement ne vient jamais du navigateur. La redirection de
 *    succès ne fait qu'afficher un message ; seul un événement signé par
 *    Stripe met une facture à « payée ».
 * 2. Un événement peut arriver deux fois, ou dans le désordre. La table
 *    `webhook_events` porte une contrainte d'unicité sur l'identifiant
 *    Stripe, et `payments.providerReference` en porte une seconde : même
 *    rejoué dix fois, un paiement ne peut pas être compté deux fois.
 * 3. Le montant enregistré est celui que Stripe confirme, pas celui que la
 *    facture espérait.
 */

type HandledEvent = { handled: boolean; reason?: string };

/** Identifiant de facture transporté par les métadonnées de l'intention. */
function invoiceIdOf(object: { metadata?: Stripe.Metadata | null }): string | null {
  const value = object.metadata?.devisiaInvoiceId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Enregistre un encaissement réussi.
 *
 * `providerReference` est unique en base : si l'événement est rejoué, la
 * création échoue silencieusement et les totaux sont simplement recalculés,
 * ce qui laisse la facture dans le même état.
 */
async function applySucceeded(intent: Stripe.PaymentIntent): Promise<HandledEvent> {
  const invoiceId = invoiceIdOf(intent);
  if (!invoiceId) return { handled: false, reason: 'métadonnée de facture absente' };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, organizationId: true, number: true, deletedAt: true },
  });
  if (!invoice || invoice.deletedAt) return { handled: false, reason: 'facture inconnue' };

  const existing = await prisma.payment.findUnique({ where: { providerReference: intent.id } });
  if (existing) {
    // Rejeu : on s'assure seulement que la facture reflète bien ce paiement.
    if (existing.status !== 'REUSSI') {
      await prisma.payment.update({
        where: { id: existing.id },
        data: { status: 'REUSSI', failureReason: null, receivedAt: new Date() },
      });
    }
    await recomputeInvoiceTotals(invoiceId);
    return { handled: true, reason: 'déjà enregistré' };
  }

  const charge = intent.latest_charge;
  const feeCents =
    charge && typeof charge !== 'string' && typeof charge.application_fee_amount === 'number'
      ? charge.application_fee_amount
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        organizationId: invoice.organizationId,
        invoiceId,
        amountCents: intent.amount_received || intent.amount,
        currency: (intent.currency || 'eur').toUpperCase(),
        method: 'CARTE',
        provider: 'STRIPE',
        status: 'REUSSI',
        providerReference: intent.id,
        feeCents,
        receivedAt: new Date(),
      },
    });
    await recomputeInvoiceTotals(invoiceId, tx);
  });

  const settled = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, totalCents: true, paidCents: true, number: true },
  });
  await notify({
    organizationId: invoice.organizationId,
    type: 'FACTURE_PAYEE',
    title: settled?.status === 'PAYEE' ? 'Facture payée' : 'Paiement reçu',
    body:
      settled?.status === 'PAYEE'
        ? `La facture ${invoice.number} a été réglée en totalité.`
        : `Un règlement partiel a été reçu pour la facture ${invoice.number}.`,
    href: `/app/factures/${invoiceId}`,
  }).catch(() => undefined);

  return { handled: true };
}

/** Note un échec sans toucher au restant dû : rien n'a été encaissé. */
async function applyFailed(intent: Stripe.PaymentIntent): Promise<HandledEvent> {
  const invoiceId = invoiceIdOf(intent);
  if (!invoiceId) return { handled: false, reason: 'métadonnée de facture absente' };
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { organizationId: true },
  });
  if (!invoice) return { handled: false, reason: 'facture inconnue' };

  const reason = intent.last_payment_error?.message ?? 'Paiement refusé.';
  const existing = await prisma.payment.findUnique({ where: { providerReference: intent.id } });
  if (existing) {
    await prisma.payment.update({
      where: { id: existing.id },
      data: { status: 'ECHOUE', failureReason: reason },
    });
  } else {
    await prisma.payment.create({
      data: {
        organizationId: invoice.organizationId,
        invoiceId,
        amountCents: intent.amount,
        currency: (intent.currency || 'eur').toUpperCase(),
        method: 'CARTE',
        provider: 'STRIPE',
        status: 'ECHOUE',
        providerReference: intent.id,
        failureReason: reason,
      },
    });
  }
  await recomputeInvoiceTotals(invoiceId);
  return { handled: true };
}

/** Remboursement : l'encaissement cesse de compter, le restant dû remonte. */
async function applyRefund(charge: Stripe.Charge): Promise<HandledEvent> {
  const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!intentId) return { handled: false, reason: 'intention absente' };
  const payment = await prisma.payment.findUnique({ where: { providerReference: intentId } });
  if (!payment) return { handled: false, reason: 'encaissement inconnu' };

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: fullyRefunded ? 'REMBOURSE' : 'REUSSI',
      amountCents: fullyRefunded ? payment.amountCents : charge.amount - charge.amount_refunded,
      refundedAt: new Date(),
    },
  });
  await recomputeInvoiceTotals(payment.invoiceId);
  return { handled: true };
}

/**
 * Point d'entrée du webhook Connect.
 *
 * L'enregistrement dans `webhook_events` sert de verrou : si l'identifiant
 * existe déjà, l'événement a été traité et on s'arrête immédiatement.
 */
export async function handleConnectEvent(event: Stripe.Event): Promise<{ skipped: boolean; reason?: string }> {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: 'stripe_connect',
        externalId: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
    });
  } catch {
    // Contrainte d'unicité : Stripe a déjà livré cet événement.
    return { skipped: true, reason: 'événement déjà traité' };
  }

  let result: HandledEvent = { handled: false, reason: 'type ignoré' };
  switch (event.type) {
    case 'payment_intent.succeeded':
      result = await applySucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      result = await applyFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      result = await applyRefund(event.data.object as Stripe.Charge);
      break;
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      await applyAccountState(account.id, account);
      result = { handled: true };
      break;
    }
    default:
      break;
  }

  await prisma.webhookEvent.updateMany({
    where: { provider: 'stripe_connect', externalId: event.id },
    data: { processedAt: new Date(), error: result.handled ? null : (result.reason ?? null) },
  });
  return { skipped: !result.handled, reason: result.reason };
}
