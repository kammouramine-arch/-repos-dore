import type { SubscriptionStatus } from './plans.ts';

/**
 * What a store says about a subscription, normalised across Apple and Google.
 *
 * Deliberately free of any runtime: the app's type-checker reaches this file through
 * the entitlement writer, and must not have to load Deno-only code to do it.
 */
export type StoreSubscription = {
  provider: 'apple' | 'google';
  productId: string;
  status: SubscriptionStatus;
  /** Entitled right now, for any reason (paid, trial, grace). */
  entitled: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  graceUntil: string | null;
  willRenew: boolean;
  transactionId: string | null;
  originalTransactionId: string;
  /** Stable id for this exact state, used to make writes idempotent. */
  eventId: string;
  raw: Record<string, unknown>;
};
