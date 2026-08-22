import { supabase } from '@/lib/supabase';
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

/** Installs a billing SDK adapter. Called once at startup when one is bundled. */
export function setPurchaseAdapter(next: PurchaseAdapter) {
  adapter = next;
}

export function purchasesAvailable(): boolean {
  return adapter.isAvailable();
}

export async function initPurchases(): Promise<void> {
  if (!adapter.isAvailable()) return;
  await adapter.init();
}

export async function getStoreProducts(productIds: string[]): Promise<StoreProduct[]> {
  if (!adapter.isAvailable()) return [];
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

/** Buys a plan and returns the verified entitlement. Throws with a readable reason. */
export async function purchase(productId: string): Promise<VerifiedSubscription> {
  if (!adapter.isAvailable()) {
    throw new PurchasesUnavailableError(
      'In-app purchases are not enabled in this build. See docs/BILLING.md.',
    );
  }
  const receipt = await adapter.purchase(productId);
  return verify(receipt);
}

/**
 * Re-verifies anything this store account already owns. Used by "Restore purchases"
 * and after a reinstall or device change.
 */
export async function restorePurchases(): Promise<VerifiedSubscription | null> {
  if (!adapter.isAvailable()) {
    throw new PurchasesUnavailableError(
      'In-app purchases are not enabled in this build. See docs/BILLING.md.',
    );
  }

  const receipts = await adapter.restore();
  let best: VerifiedSubscription | null = null;

  for (const receipt of receipts) {
    try {
      const verified = await verify(receipt);
      // Keep whichever grants access furthest into the future.
      if (!best || (verified.expires_at ?? '') > (best.expires_at ?? '')) best = verified;
    } catch {
      // A receipt the store no longer honours is not an error worth surfacing.
    }
  }
  return best;
}

export { PurchasesUnavailableError };
export type { PurchaseAdapter, PurchaseReceipt, StoreProduct } from './types';
