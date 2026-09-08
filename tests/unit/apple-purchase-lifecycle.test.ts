import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  update: undefined as undefined | ((p: unknown) => void),
  error: undefined as undefined | ((p: unknown) => void),
  request: vi.fn(), finish: vi.fn(), dispatch: vi.fn(), available: vi.fn(),
}));
vi.mock('../../mobile/node_modules/react-native/index.js', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../../mobile/src/lib/api', () => ({ api: { request: m.request } }));
vi.mock('../../mobile/src/lib/diagnostics', () => ({ recordDiagnostic: vi.fn() }));
vi.mock('../../mobile/node_modules/expo-iap/build/index.js', () => ({
  initConnection: async () => true,
  getStorefront: async () => 'FRA',
  purchaseUpdatedListener: (fn: (p: unknown) => void) => { m.update = fn; return { remove() {} }; },
  purchaseErrorListener: (fn: (p: unknown) => void) => { m.error = fn; return { remove() {} }; },
  requestPurchase: m.dispatch, finishTransaction: m.finish,
  restorePurchases: async () => {}, getAvailablePurchases: m.available,
  fetchProducts: async () => [{ id: 'test', displayPrice: '39,00 €', currency: 'EUR' }],
  isEligibleForIntroOfferIOS: async () => { throw new Error('eligibility unavailable'); },
}));
import { APPLE_PRODUCTS } from '@devisia/shared';
// Keep React Native's global FormData declarations out of the web TS program.
// Vitest still imports and executes the real mobile module at runtime.
const mobileModule = '../../mobile/src/lib/apple-purchases';
const { appleProducts, listenForApplePurchases, purchaseApplePlan, restoreApplePurchases, observeApplePurchase } = await import(mobileModule);
const purchase = { id: 'txn', productId: APPLE_PRODUCTS.ESSENTIEL, purchaseState: 'purchased', purchaseToken: 'test-only-not-a-real-receipt' };
beforeEach(() => { vi.clearAllMocks(); m.request.mockResolvedValue({}); m.dispatch.mockResolvedValue(undefined); m.finish.mockResolvedValue(undefined); m.available.mockResolvedValue([purchase]); });
describe('native purchase event lifecycle (mock SDK)', () => {
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
