import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { features } from '@/config/features';
import { AppError, toAppError } from '@/lib/errors';
import type { PurchaseAdapter, PurchaseReceipt, StoreProduct } from './types';
import { PurchasesUnavailableError } from './types';
import { unavailableAdapter } from './unavailable';

/**
 * Purchase flow.
 *
 * The native SDK produces a receipt; the receipt goes to our `subscription-verify`
 * edge function, which asks the store what is true and writes the entitlement with
 * the service role. A purchase is never granted from a client-side event — the
 * subscriptions table is read-only to the user.
 */

let adapter: PurchaseAdapter = unavailableAdapter;
let acknowledgePurchase: ((productId: string) => Promise<void>) | null = null;

/** Installs a billing SDK adapter. Called once at startup when one is bundled. */
export function setPurchaseAdapter(next: PurchaseAdapter, ack?: (productId: string) => Promise<void>) {
  adapter = next;
  acknowledgePurchase = ack ?? null;
}

export function purchasesAvailable(): boolean {
  // The flag is a kill switch: it can take buying offline without a release.
  return features.inAppPurchases && adapter.isAvailable();
}

export function purchaseAdapterId(): string {
  return adapter.id;
}

/**
 * Loads the native store adapter when the app is running in a build that has it.
 *
 * StoreKit and Play Billing are native modules: they exist in a development or store
 * build but not in Expo Go. Rather than crashing there, the app keeps the adapter that
 * explains why buying is unavailable.
 */
export async function initPurchases(): Promise<void> {
  if (!features.inAppPurchases) return;
  if (adapter !== unavailableAdapter) {
    await adapter.init();
    return;
  }

  if (Constants.appOwnership === 'expo') return;

  try {
    const { storeAdapter, acknowledge } = await import('./storeAdapter');
    if (!storeAdapter.isAvailable()) return;
    await storeAdapter.init();
    setPurchaseAdapter(storeAdapter, acknowledge);
  } catch {
    // No native module in this build: leave the honest adapter in place.
  }
}

export async function getStoreProducts(productIds: string[]): Promise<StoreProduct[]> {
  if (!purchasesAvailable()) return [];
  try {
    return await adapter.getProducts(productIds);
  } catch {
    return [];
  }
}

export type VerifiedSubscription = {
  tier: string;
  status: string;
  period: 'monthly' | 'yearly';
  expires_at: string | null;
  will_renew: boolean;
  is_trial: boolean;
};

async function verify(receipt: PurchaseReceipt): Promise<VerifiedSubscription> {
  const body =
    receipt.platform === 'apple'
      ? { platform: 'apple', receipt: receipt.receipt, product_id: receipt.productId }
      : { platform: 'google', purchase_token: receipt.purchaseToken, product_id: receipt.productId };

  const { data, error } = await supabase.functions.invoke<VerifiedSubscription>(
    'subscription-verify',
    { body },
  );

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: { code?: string; message?: string } };
        throw new AppError(
          payload.error?.message ?? 'Could not verify that purchase.',
          payload.error?.code ?? 'verification_failed',
          false,
        );
      } catch (e) {
        if (e instanceof AppError) throw e;
      }
    }
    throw toAppError(error, 'Could not verify that purchase.');
  }

  if (!data) throw new AppError('The store did not return a subscription.', 'verification_failed', false);
  return data;
}

/**
 * Buys a plan and returns the verified entitlement.
 *
 * The order matters: the store completes the purchase, the server verifies it with
 * Apple or Google, and only then is the transaction finished. If verification fails
 * the transaction stays open and the store redelivers it, so a paid purchase is never
 * silently lost.
 */
export async function purchase(productId: string): Promise<VerifiedSubscription> {
  if (!purchasesAvailable()) {
    throw new PurchasesUnavailableError(
      'In-app purchases need a development or store build. See docs/BILLING.md.',
    );
  }

  const receipt = await adapter.purchase(productId);
  const verified = await verify(receipt);

  try {
    await acknowledgePurchase?.(productId);
  } catch {
    // The entitlement is already granted; an unfinished transaction is replayed and
    // resolved on the next launch.
  }
  return verified;
}

/**
 * Re-verifies anything this store account already owns. Used by "Restore purchases"
 * and after a reinstall or device change.
 */
export async function restorePurchases(): Promise<VerifiedSubscription | null> {
  if (!purchasesAvailable()) {
    throw new PurchasesUnavailableError(
      'In-app purchases are not enabled in this build. See docs/BILLING.md.',
    );
  }

  const receipts = await adapter.restore();
  let best: VerifiedSubscription | null = null;

  for (const receipt of receipts) {
    try {
      best = pickBetter(best, await verify(receipt));
    } catch (e) {
      // A purchase already linked to another account is worth surfacing; a receipt
      // the store no longer honours is not.
      if (e instanceof AppError && e.code === 'already_claimed') throw e;
    }
  }
  return best;
}

/**
 * Of two verified subscriptions, the one that actually grants access furthest into
 * the future. Exported for testing: getting this wrong silently downgrades someone
 * who owns more than one product.
 */
export function pickBetter(
  current: VerifiedSubscription | null,
  next: VerifiedSubscription,
): VerifiedSubscription {
  if (!current) return next;

  const entitled = (value: VerifiedSubscription) => value.status !== 'expired';
  if (entitled(next) !== entitled(current)) return entitled(next) ? next : current;

  const expiry = (value: VerifiedSubscription) =>
    value.expires_at ? new Date(value.expires_at).getTime() : 0;
  return expiry(next) > expiry(current) ? next : current;
}

export { PurchasesUnavailableError };
export type { PurchaseAdapter, PurchaseReceipt, StoreProduct } from './types';
