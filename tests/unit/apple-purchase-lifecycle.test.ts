import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  update: undefined as undefined | ((p: unknown) => void),
  error: undefined as undefined | ((p: unknown) => void),
  request: vi.fn(), finish: vi.fn(), dispatch: vi.fn(), available: vi.fn(),
  products: vi.fn(), storefront: vi.fn(), diagnostic: vi.fn(),
}));
vi.mock('../../mobile/node_modules/react-native/index.js', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../../mobile/src/lib/api', () => ({ api: { request: m.request } }));
vi.mock('../../mobile/src/lib/diagnostics', () => ({ recordDiagnostic: m.diagnostic }));
vi.mock('../../mobile/node_modules/expo-iap/build/index.js', () => ({
  initConnection: async () => true,
  getStorefront: m.storefront,
  purchaseUpdatedListener: (fn: (p: unknown) => void) => { m.update = fn; return { remove() {} }; },
  purchaseErrorListener: (fn: (p: unknown) => void) => { m.error = fn; return { remove() {} }; },
  requestPurchase: m.dispatch, finishTransaction: m.finish,
  restorePurchases: async () => {}, getAvailablePurchases: m.available,
  fetchProducts: m.products,
  isEligibleForIntroOfferIOS: async () => { throw new Error('eligibility unavailable'); },
}));
import { APPLE_PRODUCTS } from '@devisia/shared';
// Keep React Native's global FormData declarations out of the web TS program.
// Vitest still imports and executes the real mobile module at runtime.
const mobileModule = '../../mobile/src/lib/apple-purchases';
const { appleProducts, listenForApplePurchases, purchaseApplePlan, restoreApplePurchases, observeApplePurchase } = await import(mobileModule);
const purchase = { id: 'txn', productId: APPLE_PRODUCTS.ESSENTIEL, purchaseState: 'purchased', purchaseToken: 'test-only-not-a-real-receipt' };
beforeEach(() => { vi.resetAllMocks(); m.request.mockResolvedValue({}); m.dispatch.mockResolvedValue(undefined); m.finish.mockResolvedValue(undefined); m.available.mockResolvedValue([purchase]); m.storefront.mockResolvedValue('FRA'); m.products.mockResolvedValue([{ id: APPLE_PRODUCTS.ESSENTIEL, displayPrice: '39,00 €', currency: 'EUR' }]); });
describe('native purchase event lifecycle (mock SDK)', () => {
  it('reconciles an existing active purchase without an interactive Apple restore', async () => {
    expect(await restoreApplePurchases(false)).toBe(1);
    expect(m.available).toHaveBeenCalledWith({ onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: false });
    expect(m.request).toHaveBeenCalledOnce();
  });
  it('does not withhold verified access while native finish stays pending', async () => {
    m.finish.mockReturnValue(new Promise(() => {}));
    m.dispatch.mockResolvedValue(purchase);
    vi.useFakeTimers();
    try {
      await expect(purchaseApplePlan('ESSENTIEL', 'org')).resolves.toBe('purchased');
      await vi.advanceTimersByTimeAsync(30_001);
    } finally { vi.useRealTimers(); }
  });
  it('unlocks retry and restore after a missing native result times out', async () => {
    vi.useFakeTimers();
    const busy: boolean[] = [];
    const stop = observeApplePurchase((value: boolean) => busy.push(value));
    try {
      const pending = purchaseApplePlan('ESSENTIEL', 'org');
      const rejected = expect(pending).rejects.toMatchObject({ code: 'TRANSACTION_TIMEOUT' });
      await vi.advanceTimersByTimeAsync(60_001);
      await rejected;
      expect(busy.at(-1)).toBe(false);
      expect(await restoreApplePurchases()).toBe(1);
      m.dispatch.mockResolvedValue(purchase);
      await purchaseApplePlan('ESSENTIEL', 'org');
    } finally { stop(); vi.useRealTimers(); }
  });
  it('processes the iOS return value without needing a root observer', async () => {
    m.dispatch.mockResolvedValue(purchase);
    await purchaseApplePlan('ESSENTIEL', 'org');
    expect(m.request).toHaveBeenCalledOnce();
    expect(m.finish).toHaveBeenCalledOnce();
  });
  it('resolves an event even when native dispatch never resolves', async () => {
    m.dispatch.mockReturnValue(new Promise(() => {}));
    const pending = purchaseApplePlan('ESSENTIEL', 'org');
    await vi.waitFor(() => expect(m.dispatch).toHaveBeenCalled());
    m.update!(purchase);
    await pending;
    expect(m.finish).toHaveBeenCalledOnce();
  });
  it('does not cancel the purchase when the root observer unmounts', async () => {
    const stop = await listenForApplePurchases(vi.fn(), vi.fn());
    const pending = purchaseApplePlan('ESSENTIEL', 'org');
    await vi.waitFor(() => expect(m.dispatch).toHaveBeenCalled());
    stop();
    m.update!(purchase);
    await pending;
  });
  it('keeps localized products when introductory eligibility cannot load', async () => {
    expect(await appleProducts()).toMatchObject({ eligible: false, products: [{ displayPrice: '39,00 €', currency: 'EUR' }] });
  });
  it('requests the exact production IDs and records missing IDs without claiming they are invalid', async () => {
    await appleProducts();
    expect(m.products).toHaveBeenCalledWith({ skus: Object.values(APPLE_PRODUCTS), type: 'subs' });
    expect(m.diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: 'PRODUCTS_RETURNED', productCount: 1, missingProductIds: [APPLE_PRODUCTS.PRO, APPLE_PRODUCTS.ENTREPRISE] }));
  });
  it('does not convert a successful native catalogue into unavailable on a separate storefront mismatch', async () => {
    m.products.mockResolvedValue([{ id: APPLE_PRODUCTS.ESSENTIEL, displayPrice: '$35.00', currency: 'USD' }]);
    expect(await appleProducts()).toMatchObject({ products: [{ displayPrice: '$35.00' }] });
    expect(m.products).toHaveBeenCalledTimes(2);
    expect(m.diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: 'STOREFRONT_METADATA_MISMATCH' }));
  });
  it('uses the fresh EUR product after a bounded metadata refetch, never the earlier USD result', async () => {
    m.products.mockResolvedValueOnce([{ id: APPLE_PRODUCTS.ESSENTIEL, displayPrice: '$35.00', currency: 'USD' }]);
    expect(await appleProducts()).toMatchObject({ products: [{ displayPrice: '39,00 €' }] });
  });
  it('distinguishes zero products from a native request error and allows retry', async () => {
    m.products.mockResolvedValueOnce([]);
    await expect(appleProducts()).rejects.toMatchObject({ code: 'PRODUCTS_EMPTY' });
    await expect(appleProducts()).resolves.toMatchObject({ products: [{ currency: 'EUR' }] });
    m.products.mockRejectedValueOnce(Object.assign(new Error('native'), { code: 'network-error' }));
    await expect(appleProducts()).rejects.toMatchObject({ code: 'network-error' });
  });
  it('shares concurrent catalogue loads, but never caches a completed price snapshot', async () => {
    await Promise.all([appleProducts(), appleProducts(), appleProducts()]);
    expect(m.products).toHaveBeenCalledTimes(1);
    await appleProducts();
    expect(m.products).toHaveBeenCalledTimes(2);
  });
  it('restores independently after catalogue failure', async () => {
    m.products.mockRejectedValueOnce(new Error('catalogue offline'));
    await expect(appleProducts()).rejects.toThrow('catalogue offline');
    expect(await restoreApplePurchases(false)).toBe(1);
    expect(m.request).toHaveBeenCalledOnce();
  });
  it('waits for server verification before finishing and resolving', async () => {
    const stop = await listenForApplePurchases(vi.fn(), vi.fn());
    let release!: () => void;
    m.request.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
    const pending = purchaseApplePlan('ESSENTIEL', 'org');
    await vi.waitFor(() => expect(m.dispatch).toHaveBeenCalled());
    m.update!(purchase);
    await vi.waitFor(() => expect(m.request).toHaveBeenCalled());
    expect(m.finish).not.toHaveBeenCalled();
    release();
    await pending;
    expect(m.finish).toHaveBeenCalled();
    stop();
  });
  it('handles native cancellation without a product ID', async () => {
    const stop = await listenForApplePurchases(vi.fn(), vi.fn());
    const pending = purchaseApplePlan('ESSENTIEL', 'org');
    await vi.waitFor(() => expect(m.dispatch).toHaveBeenCalled());
    m.error!({ code: 'user-cancelled' });
    await expect(pending).resolves.toBe('cancelled');
    expect(m.request).not.toHaveBeenCalled();
    stop();
  });
  it('rejects dispatch errors without an orphan promise', async () => {
    const stop = await listenForApplePurchases(vi.fn(), vi.fn());
    m.dispatch.mockRejectedValue(new Error('native unavailable'));
    await expect(purchaseApplePlan('ESSENTIEL', 'org')).rejects.toThrow('native unavailable');
    stop();
  });
  it('does not finish a transaction rejected by the backend', async () => {
    const stop = await listenForApplePurchases(vi.fn(), vi.fn());
    m.request.mockRejectedValue(new Error('verification failed'));
    const pending = purchaseApplePlan('ESSENTIEL', 'org');
    const rejected = expect(pending).rejects.toThrow('verification failed');
    await vi.waitFor(() => expect(m.dispatch).toHaveBeenCalled());
    m.update!(purchase);
    await rejected;
    expect(m.finish).not.toHaveBeenCalled();
    stop();
  });
  it('restores through the same verification path', async () => {
    expect(await restoreApplePurchases()).toBe(1);
    expect(m.request).toHaveBeenCalled();
    expect(m.finish).toHaveBeenCalled();
  });
});
