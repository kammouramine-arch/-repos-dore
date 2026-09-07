import { Platform } from 'react-native';
import { APPLE_PRODUCTS, APPLE_SUBSCRIPTION_GROUP, applePurchaseUserMessage, normalizeApplePurchaseError, planForAppleProduct, type PlanId } from '@devisia/shared';
import type { Purchase, ProductSubscription } from 'expo-iap';
import { api } from './api';
import { recordDiagnostic } from './diagnostics';

type Iap = typeof import('expo-iap');
const observers = new Set<(busy: boolean) => void>();
export function observeApplePurchase(listener: (busy: boolean) => void) {
  observers.add(listener);
  return () => { observers.delete(listener); };
}
function setBusy(busy: boolean) { for (const listener of observers) listener(busy); }
let sdk: Promise<Iap> | undefined;
async function store() {
  if (Platform.OS !== 'ios') throw new Error('Les abonnements Apple sont disponibles sur iPhone et iPad.');
  if (!sdk) sdk = import('expo-iap').then(async (iap) => { await iap.initConnection(); return iap; }).catch((e) => { sdk = undefined; throw e; });
  return sdk;
}

export async function appleProducts() {
  const iap = await store();
  const [products, eligible] = await Promise.all([
    iap.fetchProducts({ skus: Object.values(APPLE_PRODUCTS), type: 'subs' }),
    iap.isEligibleForIntroOfferIOS(APPLE_SUBSCRIPTION_GROUP),
  ]);
  return { products: products as ProductSubscription[], eligible };
}

const syncing = new Map<string, Promise<void>>();
type PendingPurchase = { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
const pendingPurchases = new Map<string, PendingPurchase>();

function purchaseKey(productId: string | null | undefined) {
  return productId ?? '__unknown__';
}

function logPurchaseFailure(error: unknown, context: { productId?: string | null; storefront?: string | null; transactionState?: string | null } = {}) {
  const diagnostic = normalizeApplePurchaseError(error, context);
  const rawCode = error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null;
  const serverFailure = rawCode && ['PROVIDER_UNAVAILABLE', 'INTERNAL', 'UNAUTHENTICATED', 'FORBIDDEN'].includes(rawCode);
  const networkFailure = rawCode === 'NETWORK' || rawCode === 'TIMEOUT' || diagnostic.category === 'network';
  // The local journal keeps only a native error code/category and bounded
  // storefront/product metadata. It never stores receipts, tokens or account
  // identifiers. This is enough to distinguish StoreKit, network and user
  // cancellation failures reported from a real iPhone.
  recordDiagnostic({
    area: 'billing',
    durationMs: 0,
    code: `${serverFailure ? 'APPLE_SYNC' : 'STOREKIT'}_${diagnostic.code}`,
    category: networkFailure ? 'network' : serverFailure ? 'server' : 'client',
    path: 'apple-purchase',
    status: 0,
  });
  return diagnostic;
}

/** Record a product-load failure from a paywall without exposing native data. */
export function recordApplePurchaseFailure(error: unknown, context: { productId?: string | null; storefront?: string | null; transactionState?: string | null } = {}) {
  return logPurchaseFailure(error, context);
}

function resolvePending(productId: string | null | undefined, error?: Error) {
  const key = purchaseKey(productId);
  const pending = pendingPurchases.get(key) ?? pendingPurchases.get('__unknown__');
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingPurchases.delete(key);
  pendingPurchases.delete('__unknown__');
  if (error) pending.reject(error); else pending.resolve();
}

function rejectAllPending(message: string) {
  for (const [key, pending] of pendingPurchases) {
    clearTimeout(pending.timer);
    pending.reject(new Error(message));
    pendingPurchases.delete(key);
  }
}

function iosContext(purchase: Purchase) {
  const candidate = purchase as Purchase & { storefrontCountryCodeIOS?: string | null };
  return {
    storefront: candidate.storefrontCountryCodeIOS,
    transactionState: purchase.purchaseState,
  };
}

async function sync(purchase: Purchase) {
  if (!planForAppleProduct(purchase.productId)) return;
  if (purchase.purchaseState === 'pending') {
    throw new Error('Le paiement Apple est en attente de validation.');
  }
  if (!purchase.purchaseToken) throw new Error('Le justificatif Apple est indisponible. Restaurez vos achats pour confirmer l’abonnement.');
  const key = purchase.id;
  if (syncing.has(key)) return syncing.get(key);
  const task = (async () => {
    await api.request('/api/billing/apple', { method: 'POST', json: { signedTransaction: purchase.purchaseToken } });
    const iap = await store();
    await iap.finishTransaction({ purchase, isConsumable: false });
  })();
  syncing.set(key, task);
  try { await task; } finally { syncing.delete(key); }
}

/** Listeners live at the authenticated app root, including pending purchases. */
export async function listenForApplePurchases(onSynced: () => void, onError: (error: unknown) => void, language: 'fr' | 'en' = 'fr') {
  const iap = await store();
  const purchases = iap.purchaseUpdatedListener((purchase) => {
    void sync(purchase)
      .then(() => { resolvePending(purchase.productId); onSynced(); })
      .catch((error) => {
        logPurchaseFailure(error, {
          productId: purchase.productId,
          ...iosContext(purchase),
        });
        resolvePending(purchase.productId, error instanceof Error ? error : new Error('Apple purchase could not be confirmed.'));
        onError(error);
      })
      .finally(() => setBusy(false));
  });
  const errors = iap.purchaseErrorListener((error) => {
    setBusy(false);
    const diagnostic = logPurchaseFailure(error, { productId: error.productId });
    const userMessage = applePurchaseUserMessage(diagnostic, language);
    if (diagnostic.category === 'cancelled') {
      resolvePending(error.productId);
    } else {
      const normalized = new Error(userMessage ?? diagnostic.message);
      normalized.name = diagnostic.code;
      resolvePending(error.productId, normalized);
      onError(new Error(userMessage ?? diagnostic.message));
    }
  });
  return () => {
    purchases.remove();
    errors.remove();
    rejectAllPending('La confirmation Apple a été interrompue.');
  };
}

export async function purchaseApplePlan(plan: PlanId, organizationId: string) {
  const productId = APPLE_PRODUCTS[plan];
  if (pendingPurchases.has(productId)) return;
  setBusy(true);
  try {
    const iap = await store();
    const result = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingPurchases.delete(productId);
        reject(new Error('Apple met trop de temps à confirmer cet achat. Ouvrez vos abonnements Apple ou restaurez vos achats.'));
      }, 60_000);
      pendingPurchases.set(productId, { resolve, reject, timer });
    });
    // requestPurchase only dispatches the native sheet. The promise above is
    // settled by purchaseUpdatedListener after server verification and
    // finishTransaction, so the paywall never reports success prematurely.
    await iap.requestPurchase({ type: 'subs', request: { apple: { sku: productId, appAccountToken: organizationId, andDangerouslyFinishTransactionAutomatically: false } } });
    await result;
  } catch (error) {
    const diagnostic = logPurchaseFailure(error, { productId });
    if (diagnostic.category === 'cancelled') {
      resolvePending(productId);
      return;
    }
    resolvePending(productId, error instanceof Error ? error : new Error('Apple purchase failed.'));
    throw error;
  } finally { setBusy(false); }
}

export async function restoreApplePurchases() {
  const iap = await store();
  await iap.restorePurchases();
  const purchases = await iap.getAvailablePurchases();
  const relevant = purchases.filter((p) => planForAppleProduct(p.productId));
  for (const purchase of relevant) {
    try { await sync(purchase); }
    catch (error) {
      logPurchaseFailure(error, { productId: purchase.productId, ...iosContext(purchase) });
      throw error;
    }
  }
  return relevant.length;
}

export async function manageAppleSubscriptions() {
  const iap = await store();
  await iap.showManageSubscriptionsIOS();
  await restoreApplePurchases();
}
