import { describe, expect, it, vi, beforeEach } from 'vitest';
import { appleAcquisition } from '../../packages/shared/src/acquisition';

const { createMany } = vi.hoisted(() => ({ createMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { metaEventClaim: { createMany } } }));
import { claimAcquisition } from '@/server/services/acquisitionService';
const now = Date.UTC(2026, 8, 22, 12);
const paid = { environment: 'Production', transactionId: 'tx-1', originalTransactionId: 'original-1', productId: 'fr.devisia.pro.monthly', purchaseDate: now - 1000, expiresDate: now + 30 * 86400000, type: 'Auto-Renewable Subscription', price: 29990, currency: 'EUR' };

describe('verified acquisition classification', () => {
  it('uses Apple milliunits and sends only an allowlist', () => {
    expect(appleAcquisition({ ...paid, appAccountToken: 'private' } as typeof paid, now)).toEqual({ name: 'fb_mobile_purchase', productId: paid.productId, value: 29.99, currency: 'EUR' });
  });
  it('counts an Apple-confirmed seven-day free trial without revenue', () => {
    expect(appleAcquisition({ ...paid, offerType: 1, offerDiscountType: 'FREE_TRIAL', price: 0, expiresDate: paid.purchaseDate + 7 * 86400000 }, now)).toEqual({ name: 'StartTrial', productId: paid.productId });
  });
  it.each([
    { environment: 'Sandbox' }, { revocationDate: now }, { isUpgraded: true },
    { price: 0 }, { price: undefined }, { price: NaN }, { currency: 'bad' },
    { purchaseDate: now + 1 }, { purchaseDate: now - 86400001 }, { expiresDate: now },
    { transactionId: undefined }, { type: 'Consumable' },
    { offerType: 1, offerDiscountType: 'FREE_TRIAL', expiresDate: paid.purchaseDate + 3 * 86400000 },
  ])('rejects invalid, test, historical or non-revenue input %j', (override) => {
    expect(appleAcquisition({ ...paid, ...override }, now)).toBeNull();
  });
});

describe('cross-device duplicate protection', () => {
  beforeEach(() => {
    createMany.mockReset();
    process.env.META_APP_EVENTS_ENABLED = 'true';
    process.env.META_EVENT_KEY_SECRET = 'unit-test-only-012345678901234567890123456789';
  });
  it('hands a transaction to only one racing caller', async () => {
    const seen = new Set<string>();
    createMany.mockImplementation(async ({ data }) => {
      const count = seen.has(data[0].id) ? 0 : 1;
      seen.add(data[0].id);
      return { count };
    });
    const event = appleAcquisition(paid, now)!;
    const results = await Promise.all(Array.from({ length: 10 }, () => claimAcquisition('apple:tx-1:purchase', event)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(JSON.stringify(createMany.mock.calls)).not.toContain('tx-1');
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true);
  });
  it('is disabled without both the server switch and a strong key', async () => {
    process.env.META_APP_EVENTS_ENABLED = 'false';
    expect(await claimAcquisition('x', { name: 'StartTrial' })).toBeNull();
    process.env.META_APP_EVENTS_ENABLED = 'true';
    process.env.META_EVENT_KEY_SECRET = 'short';
    expect(await claimAcquisition('x', { name: 'StartTrial' })).toBeNull();
    expect(createMany).not.toHaveBeenCalled();
  });
  it('fails closed without breaking a paid entitlement when the database fails', async () => {
    createMany.mockRejectedValue(new Error('missing migration'));
    expect(await claimAcquisition('x', { name: 'StartTrial' })).toBeNull();
  });
});
