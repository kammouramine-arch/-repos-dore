import Stripe from 'stripe';
import { env } from '../env';
import { AppError } from '../errors';
import { PLANS } from './plans';
import type { SubscriptionPlan } from '@prisma/client';

let client: Stripe | null | undefined;

/** Client Stripe, ou null si la facturation n'est pas configurée. */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = env().STRIPE_SECRET_KEY;
  client = key ? new Stripe(key, { apiVersion: '2026-07-29.dahlia' }) : null;
  return client;
}

export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new AppError('PROVIDER_UNAVAILABLE', "La facturation n'est pas encore activée sur cette instance.");
  }
  return stripe;
}

export function isBillingConfigured(): boolean {
  return getStripe() != null;
}

/** Identifiant de prix Stripe associé à une formule. */
export function stripePriceId(plan: SubscriptionPlan): string | null {
  const key = PLANS[plan].stripePriceEnvKey;
  return env()[key] ?? null;
}

/** Formule DEVISIA correspondant à un price Stripe (webhooks). */
export function planFromPriceId(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (env()[plan.stripePriceEnvKey] === priceId) return plan.id;
  }
  return null;
}

export function resetStripeClient() {
  client = undefined;
}
