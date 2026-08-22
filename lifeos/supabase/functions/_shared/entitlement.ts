import type { SupabaseClient } from '@supabase/supabase-js';
import type { Catalogue, Tier } from './plans.ts';
import type { StoreSubscription } from './storeTypes.ts';

/**
 * Writing a verified store subscription onto an account.
 *
 * Shared by the purchase path and the notification handler so both go through exactly
 * one write, with exactly one idempotency rule: `apply_store_subscription` records the
 * store's own event id first, and a replay changes nothing.
 */

/** Which plan and cadence a store product id belongs to. */
export function planForProduct(
  catalogue: Catalogue,
  productId: string,
): { tier: Tier; period: 'monthly' | 'yearly' } | null {
  for (const tier of catalogue.order) {
    const plan = catalogue.plans[tier];
    if (!plan) continue;
    if (plan.pricing.monthly?.productId === productId) return { tier, period: 'monthly' };
    if (plan.pricing.yearly?.productId === productId) return { tier, period: 'yearly' };
  }
  return null;
}

export async function applyVerified(
  admin: SupabaseClient,
  catalogue: Catalogue,
  userId: string,
  verified: StoreSubscription,
): Promise<{ tier: Tier; duplicate: boolean } | { error: string }> {
  const match = planForProduct(catalogue, verified.productId);
  if (!match) return { error: `"${verified.productId}" is not a plan in this catalogue.` };

  // An expired subscription resolves to Free — the row stays, the capability does not.
  const tier: Tier = verified.entitled ? match.tier : 'free';

  const { data, error } = await admin.rpc('apply_store_subscription', {
    p_provider: verified.provider,
    p_event_id: verified.eventId,
    p_kind: verified.status,
    p_user: userId,
    p_tier: tier,
    p_status: verified.entitled ? verified.status : 'expired',
    p_product_id: verified.productId,
    p_original_transaction_id: verified.originalTransactionId,
    p_transaction_id: verified.transactionId,
    p_period_start: verified.startedAt,
    p_period_end: verified.expiresAt,
    p_trial_ends_at: verified.trialEndsAt,
    p_grace_until: verified.graceUntil,
    p_will_renew: verified.willRenew,
    p_payload: verified.raw,
  });

  if (error) return { error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  return { tier, duplicate: Boolean(row?.duplicate) };
}
