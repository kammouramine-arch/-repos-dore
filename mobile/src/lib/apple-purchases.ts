import { Platform } from 'react-native';
import { APPLE_PRODUCTS, APPLE_SUBSCRIPTION_GROUP, planForAppleProduct, type PlanId } from '@devisia/shared';
import type { Purchase, ProductSubscription } from 'expo-iap';
import { api } from './api';

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
async function sync(purchase: Purchase) {
  if (!planForAppleProduct(purchase.productId)) return;
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
export async function listenForApplePurchases(onSynced: () => void, onError: (error: unknown) => void) {
  const iap = await store();
  const purchases = iap.purchaseUpdatedListener((purchase) => { void sync(purchase).then(onSynced).catch(onError).finally(() => setBusy(false)); });
  const errors = iap.purchaseErrorListener((error) => { setBusy(false); if (!/cancel/i.test(error.code ?? '')) onError(error); });
  return () => { purchases.remove(); errors.remove(); };
}

export async function purchaseApplePlan(plan: PlanId, organizationId: string) {
  setBusy(true);
  const iap = await store();
  try {
    await iap.requestPurchase({ type: 'subs', request: { apple: { sku: APPLE_PRODUCTS[plan], appAccountToken: organizationId, andDangerouslyFinishTransactionAutomatically: false } } });
  } finally { setBusy(false); }
}

export async function restoreApplePurchases() {
  const iap = await store();
  await iap.restorePurchases();
  const purchases = await iap.getAvailablePurchases();
  const relevant = purchases.filter((p) => planForAppleProduct(p.productId));
  for (const purchase of relevant) await sync(purchase);
  return relevant.length;
}

export async function manageAppleSubscriptions() {
  const iap = await store();
  await iap.showManageSubscriptionsIOS();
  await restoreApplePurchases();
}
