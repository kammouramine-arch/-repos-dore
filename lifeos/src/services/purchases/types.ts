import type { Tier } from '@/config/subscription';

/**
 * The store boundary.
 *
 * Buying happens through a native billing SDK, which needs a development build and
 * products configured in App Store Connect / Play Console. The app talks to that SDK
 * only through this interface, so the rest of the product does not know or care which
 * library is in use — and so a build without one behaves honestly instead of
 * pretending a purchase worked.
 */

export type BillingPeriod = 'monthly' | 'yearly';

export type StoreProduct = {
  productId: string;
  tier: Tier;
  period: BillingPeriod;
  /** Localised price string straight from the store, when available. */
  displayPrice: string | null;
  /** Whether the store is offering an introductory free period on this product. */
  hasTrial: boolean;
};

/** What a completed native purchase hands back for server verification. */
export type PurchaseReceipt =
  | { platform: 'apple'; receipt: string; productId: string }
  | { platform: 'google'; purchaseToken: string; productId: string };

export interface PurchaseAdapter {
  readonly id: string;
  /** True when a billing SDK is present and initialised. */
  isAvailable(): boolean;
  init(): Promise<void>;
  getProducts(productIds: string[]): Promise<StoreProduct[]>;
  purchase(productId: string): Promise<PurchaseReceipt>;
  /** Receipts for anything the account already owns. */
  restore(): Promise<PurchaseReceipt[]>;
}

export class PurchasesUnavailableError extends Error {
  readonly code = 'purchases_unavailable';
  constructor(message: string) {
    super(message);
    this.name = 'PurchasesUnavailableError';
  }
}
