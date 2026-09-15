import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  decode: vi.fn(), notification: vi.fn(), renewal: vi.fn(), find: vi.fn(), update: vi.fn(), lock: vi.fn(),
}));
vi.mock('@apple/app-store-server-library', () => ({
  Environment: { PRODUCTION: 'Production', SANDBOX: 'Sandbox' },
  SignedDataVerifier: class {
    verifyAndDecodeTransaction = mocks.decode;
    verifyAndDecodeNotification = mocks.notification;
    verifyAndDecodeRenewalInfo = mocks.renewal;
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { subscription: { findUnique: mocks.find }, $transaction: async (fn: (tx: unknown) => unknown) => fn({
  $executeRaw: mocks.lock,
  subscription: { findUnique: mocks.find, update: mocks.update },
}) } }));
import { handleAppleNotification, pendingRenewalProduct, syncAppleTransaction } from '@/server/services/appleBillingService';
import { toSubscriptionDTO } from '@/server/services/sessionDto';

const organizationId = '11111111-1111-4111-8111-111111111111';
const now = Date.now();
const periodEnd = now + 20 * 86_400_000;
const pro = {
  appAccountToken: organizationId, productId: 'fr.devisia.pro.monthly', originalTransactionId: 'apple-original',
  expiresDate: periodEnd, signedDate: now, purchaseDate: now - 10 * 86_400_000, type: 'Auto-Renewable Subscription', environment: 'Production',
};
const currentPro = {
  organizationId, plan: 'PRO', status: 'active', appleOriginalTransactionId: 'apple-original', appleSignedAt: new Date(now - 10 * 86_400_000),
  currentPeriodEnd: new Date(periodEnd), cancelAtPeriodEnd: false, stripeSubscriptionId: null, applePendingProductId: null,
};
function bind(current: Record<string, unknown>) {
  mocks.find.mockImplementation(async ({ where }) => where.appleOriginalTransactionId ? { organizationId } : current);
}
beforeEach(() => { vi.clearAllMocks(); mocks.update.mockResolvedValue({}); });

describe('pendingRenewalProduct', () => {
  const t = { productId: 'fr.devisia.pro.monthly' } as Parameters<typeof pendingRenewalProduct>[0];
  it('takes the signed renewal preference only when it differs, renews, and is a DEVISERA product', () => {
    expect(pendingRenewalProduct(t, { autoRenewProductId: 'fr.devisia.essentiel.monthly', autoRenewStatus: 1 } as never, null)).toBe('fr.devisia.essentiel.monthly');
    expect(pendingRenewalProduct(t, { autoRenewProductId: 'fr.devisia.pro.monthly', autoRenewStatus: 1 } as never, 'fr.devisia.essentiel.monthly')).toBeNull();
    expect(pendingRenewalProduct(t, { autoRenewProductId: 'fr.devisia.essentiel.monthly', autoRenewStatus: 0 } as never, null)).toBeNull();
    expect(pendingRenewalProduct(t, { autoRenewProductId: 'com.other.plan', autoRenewStatus: 1 } as never, null)).toBeNull();
  });
  it('keeps a known preference without renewal info and clears it once the product matches', () => {
    expect(pendingRenewalProduct(t, undefined, 'fr.devisia.essentiel.monthly')).toBe('fr.devisia.essentiel.monthly');
    expect(pendingRenewalProduct({ productId: 'fr.devisia.essentiel.monthly' } as never, undefined, 'fr.devisia.essentiel.monthly')).toBeNull();
    expect(pendingRenewalProduct(t, undefined, null)).toBeNull();
  });
});

describe('Apple renewal preference persistence', () => {
  it('records Essential as pending from a signed DID_CHANGE_RENEWAL_PREF while Pro stays the entitlement', async () => {
    bind(currentPro);
    mocks.notification.mockResolvedValue({ notificationType: 'DID_CHANGE_RENEWAL_PREF', signedDate: now + 1000, data: { signedTransactionInfo: 'tx', signedRenewalInfo: 'renewal' } });
    mocks.decode.mockResolvedValue({ ...pro });
    mocks.renewal.mockResolvedValue({ originalTransactionId: 'apple-original', autoRenewProductId: 'fr.devisia.essentiel.monthly', autoRenewStatus: 1 });
    await handleAppleNotification('signed');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      plan: 'PRO', status: 'active', applePendingProductId: 'fr.devisia.essentiel.monthly', applePendingAt: new Date(periodEnd), cancelAtPeriodEnd: false,
    }) }));
  });
  it('clears the pending product when Apple reports the renewal preference back to the current product', async () => {
    bind({ ...currentPro, applePendingProductId: 'fr.devisia.essentiel.monthly' });
    mocks.notification.mockResolvedValue({ notificationType: 'DID_CHANGE_RENEWAL_PREF', signedDate: now + 1000, data: { signedTransactionInfo: 'tx', signedRenewalInfo: 'renewal' } });
    mocks.decode.mockResolvedValue({ ...pro });
    mocks.renewal.mockResolvedValue({ originalTransactionId: 'apple-original', autoRenewProductId: 'fr.devisia.pro.monthly', autoRenewStatus: 1 });
    await handleAppleNotification('signed');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ plan: 'PRO', applePendingProductId: null, applePendingAt: null }) }));
  });
  it('applies the lower plan only when Apple signs the renewal transaction for it', async () => {
    bind({ ...currentPro, applePendingProductId: 'fr.devisia.essentiel.monthly' });
    mocks.decode.mockResolvedValue({ ...pro, productId: 'fr.devisia.essentiel.monthly', purchaseDate: periodEnd, expiresDate: periodEnd + 30 * 86_400_000, signedDate: periodEnd + 5 });
    await syncAppleTransaction('signed', organizationId);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ plan: 'ESSENTIEL', applePendingProductId: null }) }));
  });
  it('never downgrades the entitlement early: a lower-rank transaction inside the paid period becomes a preference', async () => {
    bind(currentPro);
    mocks.decode.mockResolvedValue({ ...pro, productId: 'fr.devisia.essentiel.monthly', signedDate: now + 500, purchaseDate: now + 500, expiresDate: periodEnd });
    const result = await syncAppleTransaction('signed', organizationId);
    expect(result).toEqual({ synced: true, pending: true });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ applePendingProductId: 'fr.devisia.essentiel.monthly', applePendingAt: new Date(periodEnd) });
    expect(data).not.toHaveProperty('plan');
    expect(data).not.toHaveProperty('status');
  });
  it('does not treat an upgrade or a new period as pending', async () => {
    bind({ ...currentPro, plan: 'ESSENTIEL' });
    mocks.decode.mockResolvedValue({ ...pro, signedDate: now + 500, purchaseDate: now + 500, expiresDate: periodEnd + 5 * 86_400_000 });
    await syncAppleTransaction('signed', organizationId);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ plan: 'PRO', applePendingProductId: null }) }));
  });
});

describe('subscription DTO', () => {
  it('exposes the pending plan and its effective date only for Apple subscriptions', () => {
    const base = { plan: 'PRO' as const, status: 'active' as const, trialEndsAt: null, currentPeriodEnd: new Date(periodEnd), cancelAtPeriodEnd: false };
    expect(toSubscriptionDTO({ ...base, appleProductId: 'fr.devisia.pro.monthly', applePendingProductId: 'fr.devisia.essentiel.monthly', applePendingAt: new Date(periodEnd) }))
      .toMatchObject({ provider: 'apple', plan: 'PRO', pendingPlan: 'ESSENTIEL', pendingAt: new Date(periodEnd).toISOString() });
    expect(toSubscriptionDTO({ ...base, appleProductId: 'fr.devisia.pro.monthly' })).toMatchObject({ pendingPlan: null, pendingAt: null });
    expect(toSubscriptionDTO({ ...base, stripeSubscriptionId: 'sub_1', applePendingProductId: 'fr.devisia.essentiel.monthly' })).toMatchObject({ provider: 'stripe', pendingPlan: null });
  });
});
