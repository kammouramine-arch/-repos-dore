import 'server-only';
import type Stripe from 'stripe';
import type { BillingHistoryDTO, BillingHistoryEntryDTO } from '@devisia/shared';
import { prisma } from '@/lib/prisma';
import { AppError, notFound } from '@/lib/errors';
import { getStripe } from '@/lib/billing/stripe';

const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const APPLE_RECEIPTS_URL = 'https://reportaproblem.apple.com/';

function stripeInvoiceStatus(invoice: Stripe.Invoice): BillingHistoryEntryDTO['status'] {
  if (invoice.status === 'paid') return 'paid';
  if (invoice.status === 'open' || invoice.status === 'draft') return 'open';
  if (invoice.status === 'uncollectible') return 'uncollectible';
  if (invoice.status === 'void') return 'void';
  return 'unknown';
}

/** Pure mapping kept exported for deterministic tests and buyer documentation. */
export function mapStripeInvoice(invoice: Stripe.Invoice, language: 'fr' | 'en' = 'fr'): BillingHistoryEntryDTO {
  const paidAt = invoice.status_transitions?.paid_at;
  const timestamp = paidAt ?? invoice.created;
  const amount = invoice.status === 'paid' ? invoice.amount_paid : invoice.amount_due;
  const currency = typeof invoice.currency === 'string' ? invoice.currency.toUpperCase() : 'EUR';
  return {
    id: invoice.id,
    date: new Date(timestamp * 1000).toISOString(),
    amountCents: Math.round(amount ?? 0),
    currency,
    status: stripeInvoiceStatus(invoice),
    description: invoice.number
      ? `DEVISERA · ${invoice.number}`
      : language === 'en' ? 'DEVISERA · subscription' : 'DEVISERA · abonnement',
    receiptUrl: invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null,
  };
}

/**
 * Return only billing records that the provider actually owns.
 * Apple subscription receipts stay in the Apple account; this API never
 * invents invoice rows from the local Subscription record.
 */
export async function getBillingHistory(organizationId: string, language: 'fr' | 'en' = 'fr'): Promise<BillingHistoryDTO> {
  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!subscription) throw notFound('Abonnement introuvable.');

  if (subscription.appleOriginalTransactionId || subscription.appleProductId) {
    return {
      provider: 'apple',
      entries: [],
      manageUrl: APPLE_SUBSCRIPTIONS_URL,
      receiptsUrl: APPLE_RECEIPTS_URL,
      manageAction: 'apple_subscriptions',
      note: language === 'en'
        ? 'Apple keeps your receipts and purchase history. Open your Apple account to view them.'
        : 'Apple conserve vos reçus et votre historique d’achat. Ouvrez votre compte Apple pour les consulter.',
    };
  }

  if (subscription.stripeCustomerId) {
    const stripe = getStripe();
    if (!stripe) throw new AppError('PROVIDER_UNAVAILABLE', 'La facturation Stripe n’est pas disponible pour le moment.');
    try {
      const invoices = await stripe.invoices.list({ customer: subscription.stripeCustomerId, limit: 50 });
      return {
        provider: 'stripe',
        entries: invoices.data.map((invoice) => mapStripeInvoice(invoice, language)),
        manageUrl: null,
        receiptsUrl: null,
        manageAction: 'stripe_portal',
        note: language === 'en'
          ? 'Your invoices are managed by Stripe. Open the billing portal to manage your payment method.'
          : 'Vos factures sont gérées par Stripe. Ouvrez le portail de facturation pour gérer votre moyen de paiement.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'stripe invoice list failed';
      console.warn('[billing] unable to read Stripe invoice history', { message: message.slice(0, 180) });
      throw new AppError('PROVIDER_UNAVAILABLE', 'L’historique de facturation est temporairement indisponible.');
    }
  }

  return {
    provider: 'trial',
    entries: [],
    manageUrl: null,
    receiptsUrl: null,
    manageAction: null,
    note: language === 'en'
      ? 'No payment has been recorded for this business yet.'
      : 'Aucun paiement n’est encore enregistré pour cette entreprise.',
  };
}
