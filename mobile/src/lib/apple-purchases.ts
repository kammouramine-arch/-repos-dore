import { Platform } from 'react-native';
import { APPLE_PRODUCTS, APPLE_SUBSCRIPTION_GROUP, applePurchaseUserMessage, normalizeApplePurchaseError, planForAppleProduct, type PlanId } from '@devisia/shared';
import type { Purchase, ProductSubscription } from 'expo-iap';
import { api } from './api';
import { recordDiagnostic } from './diagnostics';
import { consistentAppleCurrency } from './apple-offer';

type Iap = typeof import('expo-iap');
const observers = new Set<(busy: boolean) => void>();
let purchaseBusy = false;
export function observeApplePurchase(listener: (busy: boolean) => void) {
  observers.add(listener);
  listener(purchaseBusy);
  return () => { observers.delete(listener); };
}
function setBusy(busy: boolean) { purchaseBusy = busy; for (const listener of observers) listener(busy); }
let sdk: Promise<Iap> | undefined;
async function bounded<T>(operation: Promise<T>, code: string, ms = 30_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('Apple confirmation is temporarily unavailable. Please retry or restore purchases.'), { code })), ms);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
async function store() {
  if (Platform.OS !== 'ios') throw new Error('Les abonnements Apple sont disponibles sur iPhone et iPad.');
  if (!sdk) sdk = import('expo-iap').then(async (iap) => {
    const connected = await bounded(iap.initConnection(), 'CONNECTION_TIMEOUT');
    if (!connected) throw Object.assign(new Error('Apple connection was not established.'), { code: 'CONNECTION_NOT_READY' });
    return iap;
  }).catch((e) => { sdk = undefined; throw e; });
  return sdk;
}

let catalogueFlight: Promise<{ products: ProductSubscription[]; eligible: boolean; storefront: string }> | undefined;
export function appleProducts(freshAfterPending = false): Promise<{ products: ProductSubscription[]; eligible: boolean; storefront: string }> {
  // A foreground/account change or pre-purchase refresh must not adopt an
  // in-flight snapshot requested before that transition.
  if (freshAfterPending && catalogueFlight) {
    recordDiagnostic({ area: 'billing', path: 'apple-products', code: 'WAIT_THEN_REFETCH', durationMs: 0, cachePolicy: 'wait-for-inflight-then-native-fetch' });
    return catalogueFlight.catch(() => undefined).then(() => appleProducts());
  }
  // Mount, foreground and Retry can overlap. Share only the in-flight query,
  // never cache prices across requests or Apple account/storefront changes.
  if (!catalogueFlight) catalogueFlight = loadAppleProducts().finally(() => { catalogueFlight = undefined; });
  else recordDiagnostic({ area: 'billing', path: 'apple-products', code: 'SHARED_INFLIGHT', durationMs: 0, cachePolicy: 'shared-current-request-not-persisted-cache' });
  return catalogueFlight;
}

async function loadAppleProducts() {
  const started = Date.now();
  const requested = Object.values(APPLE_PRODUCTS);
  let storefront = 'unknown';
  const log = (code: string, extra: Partial<Parameters<typeof recordDiagnostic>[0]> = {}) => recordDiagnostic({ area: 'billing', path: 'apple-products', durationMs: Date.now() - started, code, category: 'ok', storefront, ...extra });
  log('PRODUCTS_REQUESTED', { requestedProductIds: requested, cachePolicy: 'native-fetch; no-app-persisted-cache; native-cache-unknown' });
  try {
  const iap = await store();
  const before = await bounded(iap.getStorefront(), 'STOREFRONT_TIMEOUT', 3_000).catch(() => 'unknown');
  let [products, eligible] = await Promise.all([
    bounded(iap.fetchProducts({ skus: requested, type: 'subs' }), 'PRODUCTS_TIMEOUT'),
    bounded(iap.isEligibleForIntroOfferIOS(APPLE_SUBSCRIPTION_GROUP), 'ELIGIBILITY_TIMEOUT', 5_000).catch(() => { log('INTRO_ELIGIBILITY_UNKNOWN', { category: 'client' }); return false; }),
  ]);
  storefront = await bounded(iap.getStorefront(), 'STOREFRONT_TIMEOUT', 3_000).catch(() => 'unknown');
  const returned = () => log('PRODUCTS_RETURNED', { returnedProductIds: (products ?? []).map(p => p.id), missingProductIds: requested.filter(id => !products?.some(p => p.id === id)), productCount: products?.length ?? 0 });
  returned();
  if (before !== storefront || !consistentAppleCurrency(products ?? [], storefront)) {
    log('PRODUCTS_METADATA_REFRESH', { category: 'client' });
    products = await bounded(iap.fetchProducts({ skus: requested, type: 'subs' }), 'PRODUCTS_TIMEOUT');
    eligible = await bounded(iap.isEligibleForIntroOfferIOS(APPLE_SUBSCRIPTION_GROUP), 'ELIGIBILITY_TIMEOUT', 5_000).catch(() => { log('INTRO_ELIGIBILITY_UNKNOWN', { category: 'client' }); return false; });
    returned();
    if (!consistentAppleCurrency(products ?? [], storefront)) {
      // A separate Storefront.current snapshot is not a price authority. It can
      // disagree in TestFlight. Do not turn a successful native catalogue into
      // "products unavailable", nor fabricate/conversion-map a replacement.
      log('STOREKIT_METADATA_MISMATCH', { category: 'client' });
    }
  }
  const usable = (products ?? []).filter(p => requested.includes(p.id) && typeof p.displayPrice === 'string' && p.displayPrice.trim());
  if (!usable.length) throw Object.assign(new Error('Apple returned no usable subscription products.'), { code: products?.length ? 'PRODUCT_METADATA_INCOMPLETE' : 'PRODUCTS_EMPTY' });
  for (const product of products ?? []) {
    const p = product as ProductSubscription & { subscriptionPeriodUnitIOS?: string; subscriptionPeriodNumberIOS?: string; introductoryPricePaymentModeIOS?: string; introductoryPriceSubscriptionPeriodIOS?: string; introductoryPriceNumberOfPeriodsIOS?: string; introductoryPriceIOS?: string };
    log('PRODUCT_METADATA', { productId: p.id, currency: p.currency, displayPrice: p.displayPrice,
      subscriptionPeriodUnit: p.subscriptionPeriodUnitIOS ?? null, subscriptionPeriodCount: p.subscriptionPeriodNumberIOS ?? null,
      introPaymentMode: p.introductoryPricePaymentModeIOS ?? null, introPeriod: p.introductoryPriceSubscriptionPeriodIOS ?? null,
      introPeriodCount: p.introductoryPriceNumberOfPeriodsIOS ?? null, introPrice: p.introductoryPriceIOS ?? null, introEligible: eligible });
  }
  log('PRODUCTS_READY', { productCount: usable.length });
  return { products: usable as ProductSubscription[], eligible, storefront };
  } catch (error) {
    const native = normalizeApplePurchaseError(error);
    log('PRODUCTS_FAILED', { category: native.category === 'network' ? 'network' : 'client', nativeCode: native.code });
    throw error;
  }
}

const syncing = new Map<string, Promise<void>>();
type PendingPurchase = { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
const pendingPurchases = new Map<string, PendingPurchase>();

function purchaseKey(productId: string | null | undefined) {
  return productId ?? '__unknown__';
}

function logPurchaseFailure(error: unknown, context: { productId?: string | null; storefront?: string | null; transactionState?: string | null } = {}) {
  const diagnostic = normalizeApplePurchaseError(error, context);
  const metadata = error && typeof error === 'object' ? error as { requestId?: unknown; status?: unknown } : {};
  const rawCode = error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null;
  const serverFailure = typeof metadata.status === 'number' && metadata.status > 0;
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
    status: typeof metadata.status === 'number' ? metadata.status : 0,
    requestId: typeof metadata.requestId === 'string' ? metadata.requestId.slice(0, 100) : undefined,
    productId: diagnostic.productId,
    storefront: diagnostic.storefront,
    transactionState: diagnostic.transactionState,
  });
  return diagnostic;
}

/** Record a product-load failure from a paywall without exposing native data. */
export function recordApplePurchaseFailure(error: unknown, context: { productId?: string | null; storefront?: string | null; transactionState?: string | null } = {}) {
  return logPurchaseFailure(error, context);
}

function resolvePending(productId: string | null | undefined, error?: Error) {
  const key = productId ? purchaseKey(productId) : pendingPurchases.size === 1 ? pendingPurchases.keys().next().value! : '__unknown__';
  const pending = pendingPurchases.get(key);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingPurchases.delete(key);
  pendingPurchases.delete('__unknown__');
  if (error) pending.reject(error); else pending.resolve();
}

const transactionReferences = new Map<string, string>();
let transactionSequence = 0;
function stage(code: string, purchase: Purchase) {
  // Opaque process-local reference: never emit Apple's raw transaction ID.
  if (!transactionReferences.has(purchase.id)) {
    if (transactionReferences.size >= 120) transactionReferences.delete(transactionReferences.keys().next().value!);
    transactionReferences.set(purchase.id, `purchase-${++transactionSequence}`);
  }
  recordDiagnostic({ area: 'billing', durationMs: 0, code, category: 'ok', productId: purchase.productId, transactionReference: transactionReferences.get(purchase.id), ...iosContext(purchase) });
}

function iosContext(purchase: Purchase) {
  const candidate = purchase as Purchase & { storefrontCountryCodeIOS?: string | null };
  return {
    storefront: candidate.storefrontCountryCodeIOS ?? undefined,
    transactionState: purchase.purchaseState,
  };
}

async function sync(purchase: Purchase) {
  if (!planForAppleProduct(purchase.productId)) return;
  if (purchase.purchaseState === 'pending') {
    throw Object.assign(new Error('Le paiement Apple est en attente de validation.'), { code: 'PAYMENT_PENDING' });
  }
  if (!purchase.purchaseToken) throw Object.assign(new Error('Le justificatif Apple est indisponible. Restaurez vos achats pour confirmer l’abonnement.'), { code: 'RECEIPT_MISSING' });
  const key = purchase.id;
  if (syncing.has(key)) return syncing.get(key);
  const task = (async () => {
    stage('TRANSACTION_RECEIVED', purchase);
    await api.request('/api/billing/apple', { method: 'POST', json: { signedTransaction: purchase.purchaseToken } });
    stage('ENTITLEMENT_VERIFIED', purchase);
    const iap = await store();
    // Server access is already persisted. A delayed finish must not prevent
    // session refresh/unlock; the unfinished transaction can be retried later.
    void bounded(iap.finishTransaction({ purchase, isConsumable: false }), 'FINISH_TIMEOUT')
      .then(() => stage('TRANSACTION_FINISHED', purchase))
      .catch(error => logPurchaseFailure(error, { productId: purchase.productId, ...iosContext(purchase) }));
  })();
  syncing.set(key, task);
  try { await task; }
  catch (error) { logPurchaseFailure(error, { productId: purchase.productId, ...iosContext(purchase) }); throw error; }
  finally { syncing.delete(key); }
}

/** Listeners live at the authenticated app root, including pending purchases. */
export async function listenForApplePurchases(onSynced: () => void, onError: (error: unknown) => void, language: 'fr' | 'en' = 'fr') {
  const iap = await store();
  const purchases = iap.purchaseUpdatedListener((purchase) => {
    if (purchaseBusy || !planForAppleProduct(purchase.productId)) return;
    void sync(purchase)
      .then(() => { resolvePending(purchase.productId); onSynced(); })
      .catch((error) => {
        logPurchaseFailure(error, {
          productId: purchase.productId,
          ...iosContext(purchase),
        });
        resolvePending(purchase.productId, error instanceof Error ? error : new Error('Apple purchase could not be confirmed.'));
        if (!purchaseBusy) onError(error);
      });
  }, { dedupeTransactionIOS: false });
  const errors = iap.purchaseErrorListener((error) => {
    if (purchaseBusy) return; // The active attempt owns error presentation.
    const diagnostic = logPurchaseFailure(error, { productId: error.productId });
    const userMessage = applePurchaseUserMessage(diagnostic, language);
    if (diagnostic.category === 'cancelled') {
      resolvePending(error.productId);
    } else {
      const normalized = new Error(userMessage ?? diagnostic.message);
      Object.assign(normalized, { code: diagnostic.code });
      resolvePending(error.productId, normalized);
      onError(new Error(userMessage ?? diagnostic.message));
    }
  });
  return () => {
    purchases.remove();
    errors.remove();
    // A locale/session refresh may replace this observer while Apple's sheet
    // is open. The purchase owns its own listeners and must not be cancelled.
  };
}

export async function purchaseApplePlan(plan: PlanId, organizationId: string) {
  const productId = APPLE_PRODUCTS[plan];
  if (purchaseBusy) throw new Error('Un achat Apple est déjà en cours.');
  setBusy(true);
  let removeAttempt: (() => void) | undefined;
  let active = true;
  let cancelled = false;
  try {
    const iap = await store();
    const result = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = Object.assign(new Error('Apple met trop de temps à confirmer cet achat. Ouvrez vos abonnements Apple ou restaurez vos achats.'), { code: 'TRANSACTION_TIMEOUT' });
        resolvePending(productId, error);
      }, 60_000);
      pendingPurchases.set(productId, { resolve, reject, timer });
    });
    // Listener registration itself may throw before result is awaited.
    void result.catch(() => undefined);
    const received = new Set<string>();
    const receive = (purchase: Purchase) => {
      if (purchase.productId !== productId) return;
      if (!active || received.has(purchase.id)) return;
      received.add(purchase.id);
      void sync(purchase).then(() => { if (active) resolvePending(productId); }).catch((error) => { if (active) resolvePending(productId, error); });
    };
    const failed = (error: unknown) => {
      const diagnostic = logPurchaseFailure(error, { productId });
      if (!active || (diagnostic.productId && diagnostic.productId !== productId)) return;
      cancelled = diagnostic.category === 'cancelled';
      resolvePending(productId, diagnostic.category === 'cancelled' ? undefined : error instanceof Error ? error : Object.assign(new Error(diagnostic.message), { code: diagnostic.code }));
    };
    // Installed BEFORE dispatch, independent of the React/session lifecycle.
    // Server verification is idempotent; allow retries of unfinished updates.
    const updates = iap.purchaseUpdatedListener(receive, { dedupeTransactionIOS: false });
    removeAttempt = () => updates.remove();
    const errors = iap.purchaseErrorListener(failed);
    removeAttempt = () => { updates.remove(); errors.remove(); };
    recordDiagnostic({ area: 'billing', durationMs: 0, code: 'PURCHASE_INVOKED', category: 'ok', productId });
    // expo-iap 5 also returns transactions on iOS. Process either channel.
    // Do NOT wait for dispatch after an event/cancellation settled the result.
    void iap.requestPurchase({ type: 'subs', request: { apple: { sku: productId, appAccountToken: organizationId, andDangerouslyFinishTransactionAutomatically: false } } })
      .then((returned) => { for (const purchase of Array.isArray(returned) ? returned : returned ? [returned] : []) receive(purchase); })
      .catch(failed);
    await result;
    return cancelled ? 'cancelled' as const : 'purchased' as const;
  } catch (error) {
    const diagnostic = logPurchaseFailure(error, { productId });
    if (diagnostic.category === 'cancelled') {
      resolvePending(productId);
      return 'cancelled' as const;
    }
    resolvePending(productId, error instanceof Error ? error : new Error('Apple purchase failed.'));
    throw error;
  } finally { active = false; removeAttempt?.(); setBusy(false); }
}

export async function restoreApplePurchases(interactive = true) {
  if (purchaseBusy) throw new Error('Un achat Apple est déjà en cours.');
  setBusy(true);
  try {
    const iap = await store();
    if (interactive) await bounded(iap.restorePurchases(), 'RESTORE_TIMEOUT');
    const purchases = await bounded(iap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: false }), 'RESTORE_PRODUCTS_TIMEOUT');
    const relevant = purchases.filter((p) => planForAppleProduct(p.productId));
    for (const purchase of relevant) {
      try { await sync(purchase); }
      catch (error) {
        logPurchaseFailure(error, { productId: purchase.productId, ...iosContext(purchase) });
        throw error;
      }
    }
    return relevant.length;
  } finally { setBusy(false); }
}

export async function manageAppleSubscriptions() {
  const iap = await store();
  await iap.showManageSubscriptionsIOS();
  await restoreApplePurchases();
}
