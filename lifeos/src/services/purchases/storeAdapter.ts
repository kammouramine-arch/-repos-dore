import { Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';
import type { PurchaseAdapter, PurchaseReceipt, StoreProduct } from './types';
import { PurchasesUnavailableError } from './types';
import { DEFAULT_CATALOGUE, type Tier } from '@/config/subscription';

/**
 * The real store adapter, backed by StoreKit 2 on iOS and Google Play Billing on
 * Android through `expo-iap`.
 *
 * Purchases are event-based: `requestPurchase` opens the store sheet and the result
 * arrives on a listener. This adapter bridges that back to a promise so the rest of
 * the app can treat buying as a normal async call — and, crucially, only resolves once
 * the store has actually reported a completed purchase.
 *
 * Nothing here grants entitlement. It returns the store's own token, which the server
 * verifies with Apple or Google before anything is written. The transaction is only
 * finished after that verification succeeds, so a purchase that fails to verify is
 * replayed by the store rather than lost.
 *
 * Requires a development build — StoreKit and Play Billing are native, so this is
 * unavailable in Expo Go, where the app falls back to the honest "not configured"
 * adapter.
 */

/** Every product id in the catalogue, so the UI never lists one the store lacks. */
function catalogueProductIds(): string[] {
  const ids: string[] = [];
  for (const tier of DEFAULT_CATALOGUE.order) {
    const plan = DEFAULT_CATALOGUE.plans[tier];
    if (plan?.pricing.monthly) ids.push(plan.pricing.monthly.productId);
    if (plan?.pricing.yearly) ids.push(plan.pricing.yearly.productId);
  }
  return ids;
}

function tierForProduct(productId: string): { tier: Tier; period: 'monthly' | 'yearly' } | null {
  for (const tier of DEFAULT_CATALOGUE.order) {
    const plan = DEFAULT_CATALOGUE.plans[tier];
    if (plan?.pricing.monthly?.productId === productId) return { tier, period: 'monthly' };
    if (plan?.pricing.yearly?.productId === productId) return { tier, period: 'yearly' };
  }
  return null;
}

/** The unified token: a StoreKit 2 JWS on iOS, a purchase token on Android. */
function toReceipt(purchase: {
  productId: string;
  purchaseToken?: string | null;
  purchaseTokenAndroid?: string | null;
  transactionId?: string | null;
}): PurchaseReceipt {
  const token = purchase.purchaseToken ?? purchase.purchaseTokenAndroid ?? purchase.transactionId ?? '';
  if (!token) throw new PurchasesUnavailableError('The store returned a purchase with no token.');

  return Platform.OS === 'ios'
    ? { platform: 'apple', receipt: token, productId: purchase.productId }
    : { platform: 'google', purchaseToken: token, productId: purchase.productId };
}

let connected = false;

export const storeAdapter: PurchaseAdapter = {
  id: 'expo-iap',

  isAvailable() {
    // The native module only exists in a development or store build.
    return Platform.OS === 'ios' || Platform.OS === 'android';
  },

  async init() {
    if (connected) return;
    await initConnection();
    connected = true;
  },

  async getProducts(productIds: string[]): Promise<StoreProduct[]> {
    await this.init();
    const wanted = productIds.length > 0 ? productIds : catalogueProductIds();

    const products = (await fetchProducts({ skus: wanted, type: 'subs' })) as unknown as {
      id?: string;
      productId?: string;
      displayPrice?: string;
      price?: string;
      subscriptionOfferDetailsAndroid?: { offerTags?: string[] }[];
      subscriptionInfoIOS?: { introductoryOffer?: unknown };
    }[];

    return (products ?? [])
      .map((product) => {
        const productId = product.productId ?? product.id ?? '';
        const match = tierForProduct(productId);
        if (!match) return null;

        const androidTrial = (product.subscriptionOfferDetailsAndroid ?? []).some((offer) =>
          (offer.offerTags ?? []).some((tag) => tag.toLowerCase().includes('trial')),
        );

        return {
          productId,
          tier: match.tier,
          period: match.period,
          // The store's localised price is the one the user is actually charged.
          displayPrice: product.displayPrice ?? product.price ?? null,
          hasTrial: androidTrial || Boolean(product.subscriptionInfoIOS?.introductoryOffer),
        } satisfies StoreProduct;
      })
      .filter((product): product is StoreProduct => product !== null);
  },

  /**
   * Opens the store sheet and resolves with the receipt once the purchase completes.
   * The transaction is deliberately *not* finished here — the caller finishes it after
   * the server has verified it.
   */
  async purchase(productId: string): Promise<PurchaseReceipt> {
    await this.init();

    return new Promise<PurchaseReceipt>((resolve, reject) => {
      let settled = false;

      const done = (fn: () => void) => {
        if (settled) return;
        settled = true;
        purchaseSub.remove();
        errorSub.remove();
        clearTimeout(timer);
        fn();
      };

      const purchaseSub = purchaseUpdatedListener((purchase: any) => {
        if (purchase?.productId !== productId) return;
        try {
          const receipt = toReceipt(purchase);
          done(() => resolve(receipt));
        } catch (e) {
          done(() => reject(e));
        }
      });

      const errorSub = purchaseErrorListener((error: any) => {
        const cancelled = String(error?.code ?? '').toLowerCase().includes('cancel');
        done(() =>
          reject(
            new PurchasesUnavailableError(
              cancelled ? 'Purchase cancelled.' : (error?.message ?? 'The store could not complete that purchase.'),
            ),
          ),
        );
      });

      // The sheet is modal; if nothing comes back at all, do not hang forever.
      const timer = setTimeout(
        () => done(() => reject(new PurchasesUnavailableError('The store did not respond.'))),
        5 * 60 * 1000,
      );

      requestPurchase({
        request: { apple: { sku: productId }, google: { skus: [productId] } },
        type: 'subs',
      }).catch((e: any) => done(() => reject(e)));
    });
  },

  /** Everything this store account currently owns, for Restore Purchases. */
  async restore(): Promise<PurchaseReceipt[]> {
    await this.init();
    const purchases = (await getAvailablePurchases()) as unknown as {
      productId: string;
      purchaseToken?: string | null;
      purchaseTokenAndroid?: string | null;
      transactionId?: string | null;
    }[];

    return (purchases ?? [])
      .filter((purchase) => tierForProduct(purchase.productId))
      .map((purchase) => {
        try {
          return toReceipt(purchase);
        } catch {
          return null;
        }
      })
      .filter((receipt): receipt is PurchaseReceipt => receipt !== null);
  },
};

/**
 * Tells the store the purchase is complete. Called only after the server has verified
 * it: until then the store keeps redelivering, which is the behaviour we want if
 * verification fails or the app dies mid-flow.
 */
export async function acknowledge(productId: string): Promise<void> {
  const purchases = (await getAvailablePurchases()) as unknown as {
    productId: string;
  }[];
  const purchase = (purchases ?? []).find((p) => p.productId === productId);
  if (!purchase) return;
  await finishTransaction({ purchase: purchase as never, isConsumable: false });
}

export async function disconnect(): Promise<void> {
  if (!connected) return;
  await endConnection();
  connected = false;
}
