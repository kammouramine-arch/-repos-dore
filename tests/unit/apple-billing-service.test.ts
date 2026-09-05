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
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: async (fn: (tx: unknown) => unknown) => fn({
  $executeRaw: mocks.lock,
  subscription: { findUnique: mocks.find, update: mocks.update },
}) } }));
import { syncAppleTransaction, handleAppleNotification } from '@/server/services/appleBillingService';

const organizationId = '11111111-1111-4111-8111-111111111111';
const signedDate = Date.now();
const transaction = {
  appAccountToken: organizationId, productId: 'fr.devisia.pro.monthly',
  originalTransactionId: 'apple-original', expiresDate: signedDate + 86_400_000,
  signedDate, purchaseDate: signedDate - 1_000, type: 'Auto-Renewable Subscription', environment: 'Sandbox',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.decode.mockResolvedValue({ ...transaction });
  mocks.find.mockResolvedValue({ status: 'incomplete', appleSignedAt: null, stripeSubscriptionId: null });
  mocks.update.mockResolvedValue({});
});
describe('verified Apple billing persistence', () => {
  it('rejects a receipt tied to a different organization before any database access', async () => {
    await expect(syncAppleTransaction('signed', '22222222-2222-4222-8222-222222222222')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it('ignores older receipts after a newer notification', async () => {
    mocks.find.mockResolvedValue({ appleSignedAt: new Date(signedDate + 1), status: 'active' });
    await expect(syncAppleTransaction('signed', organizationId)).resolves.toEqual({ synced: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('does not replace an active web subscription', async () => {
    mocks.find.mockResolvedValue({ stripeSubscriptionId: 'sub_existing', status: 'active' });
    await expect(syncAppleTransaction('signed', organizationId)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('takes plan and free-trial dates from verified transaction fields', async () => {
    mocks.decode.mockResolvedValue({ ...transaction, offerType: 1, offerDiscountType: 'FREE_TRIAL' });
    await syncAppleTransaction('signed', organizationId);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      plan: 'PRO', status: 'trialing', trialEndsAt: new Date(transaction.expiresDate), appleEnvironment: 'Sandbox',
    }) }));
  });
  it('revokes access when Apple provides a refund date', async () => {
    mocks.decode.mockResolvedValue({ ...transaction, revocationDate: signedDate - 500 });
    await syncAppleTransaction('signed', organizationId);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      status: 'canceled', currentPeriodEnd: new Date(signedDate - 500),
    }) }));
  });
  it('rejects mismatched renewal information in notifications', async () => {
    mocks.notification.mockResolvedValue({ data: { signedTransactionInfo: 'signed', signedRenewalInfo: 'renewal' } });
    mocks.renewal.mockResolvedValue({ originalTransactionId: 'different' });
    await expect(handleAppleNotification('notification')).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
