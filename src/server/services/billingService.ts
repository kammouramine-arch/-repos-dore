import 'server-only';
import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/env';
import { AppError, notFound } from '@/lib/errors';
import { planFromPriceId, requireStripe, stripePriceId } from '@/lib/billing/stripe';
import { PLANS, TRIAL_DAYS } from '@/lib/billing/plans';
import { getEmailProvider, paymentReceiptEmail } from '@/lib/email';
import { notify } from './notificationService';
import { recordAudit } from './auditService';
import { trackEvent } from './analyticsService';

/** Session Stripe Checkout pour souscrire ou changer de formule. */
export async function createCheckoutSession(params: {
  organizationId: string;
  userId: string;
  userEmail: string;
  plan: SubscriptionPlan;
}) {
  const stripe = requireStripe();
  const priceId = stripePriceId(params.plan);
  if (!priceId) {
    throw new AppError('PROVIDER_UNAVAILABLE', `Aucun tarif Stripe configuré pour la formule ${PLANS[params.plan].name}.`);
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: params.organizationId },
  });

  let customerId = subscription?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: params.userEmail,
      metadata: { organizationId: params.organizationId },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { organizationId: params.organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: subscription?.status === 'trialing' ? TRIAL_DAYS : undefined,
      metadata: { organizationId: params.organizationId, plan: params.plan },
    },
    metadata: { organizationId: params.organizationId, plan: params.plan },
    success_url: appUrl('/app/parametres/abonnement?statut=succes'),
    cancel_url: appUrl('/app/parametres/abonnement?statut=annule'),
  });

  return session.url;
}

/** Portail Stripe pour gérer moyen de paiement, factures et résiliation. */
export async function createBillingPortalSession(organizationId: string) {
  const stripe = requireStripe();
  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!subscription?.stripeCustomerId) {
    throw notFound('Aucun abonnement Stripe associé à cette entreprise.');
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: appUrl('/app/parametres/abonnement'),
  });
  return session.url;
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'incomplete',
  paused: 'canceled',
};

/**
 * Traitement des webhooks Stripe.
 *
 * L'état d'abonnement provient uniquement de Stripe : le frontend n'est jamais
 * une source de vérité. Chaque événement est enregistré pour l'idempotence.
 */
export async function handleStripeEvent(event: Stripe.Event) {
  const alreadyProcessed = await prisma.webhookEvent.findUnique({
    where: { provider_externalId: { provider: 'stripe', externalId: event.id } },
  });
  if (alreadyProcessed?.processedAt) return { skipped: true };

  await prisma.webhookEvent.upsert({
    where: { provider_externalId: { provider: 'stripe', externalId: event.id } },
    create: {
      provider: 'stripe',
      externalId: event.id,
      type: event.type,
      payload: event as unknown as object,
    },
    update: { type: event.type },
  });

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId;
      if (organizationId && session.subscription) {
        await prisma.subscription.update({
          where: { organizationId },
          data: {
            stripeSubscriptionId: String(session.subscription),
            stripeCustomerId: session.customer ? String(session.customer) : undefined,
            status: 'active',
            plan: (session.metadata?.plan as SubscriptionPlan) ?? undefined,
          },
        });
        await trackEvent('subscription_started', { organizationId });
        await notify({
          organizationId,
          type: 'ABONNEMENT',
          title: 'Votre abonnement DEVISIA est actif.',
          href: '/app/parametres/abonnement',
        });
        await recordAudit({ action: 'subscription.updated', organizationId, metadata: { event: event.type } });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId =
        subscription.metadata?.organizationId ??
        (
          await prisma.subscription.findFirst({
            where: { stripeCustomerId: String(subscription.customer) },
            select: { organizationId: true },
          })
        )?.organizationId;
      if (!organizationId) break;

      const priceId = subscription.items.data[0]?.price?.id;
      const periodEnd = subscription.items.data[0]?.current_period_end;

      await prisma.subscription.update({
        where: { organizationId },
        data: {
          stripeSubscriptionId: subscription.id,
          status: STATUS_MAP[subscription.status] ?? 'incomplete',
          plan: planFromPriceId(priceId) ?? undefined,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      await recordAudit({
        action: 'subscription.updated',
        organizationId,
        metadata: { status: subscription.status },
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const record = await prisma.subscription.findFirst({
        where: { stripeCustomerId: String(invoice.customer) },
        include: { organization: { include: { businessProfile: true } } },
      });
      if (record?.organization.businessProfile?.email) {
        await getEmailProvider()
          .send({
            to: record.organization.businessProfile.email,
            ...paymentReceiptEmail({
              plan: PLANS[record.plan].name,
              amountCents: invoice.amount_paid ?? 0,
              periodEnd: record.currentPeriodEnd,
            }),
          })
          .catch(() => undefined);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const record = await prisma.subscription.findFirst({
        where: { stripeCustomerId: String(invoice.customer) },
      });
      if (record) {
        await prisma.subscription.update({
          where: { organizationId: record.organizationId },
          data: { status: 'past_due' },
        });
        await notify({
          organizationId: record.organizationId,
          type: 'ABONNEMENT',
          title: 'Votre dernier paiement a échoué.',
          body: 'Mettez à jour votre moyen de paiement pour continuer à utiliser DEVISIA.',
          href: '/app/parametres/abonnement',
        });
      }
      break;
    }

    default:
      break;
  }

  await prisma.webhookEvent.update({
    where: { provider_externalId: { provider: 'stripe', externalId: event.id } },
    data: { processedAt: new Date() },
  });

  return { skipped: false };
}
