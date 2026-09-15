import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ subscription: vi.fn(), invoices: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { subscription: { findUnique: m.subscription } } }));
vi.mock('@/lib/billing/stripe', () => ({ getStripe: () => ({ invoices: { list: m.invoices } }) }));
import { getBillingHistory } from '@/server/services/billingHistoryService';
beforeEach(() => vi.clearAllMocks());
describe('integrated provider-owned billing contract', () => {
  it('returns Apple links, never invented invoice rows', async () => {
    m.subscription.mockResolvedValue({ appleOriginalTransactionId: 'test-transaction' });
    expect(await getBillingHistory('org', 'en')).toMatchObject({
      provider: 'apple', entries: [], manageAction: 'apple_subscriptions',
      manageUrl: 'https://apps.apple.com/account/subscriptions',
      receiptsUrl: 'https://reportaproblem.apple.com/',
    });
    expect(m.invoices).not.toHaveBeenCalled();
  });
  it('loads only the current business Stripe customer', async () => {
    m.subscription.mockResolvedValue({ stripeCustomerId: 'cus_test' });
    m.invoices.mockResolvedValue({ data: [{ id: 'in_test', status: 'open', amount_paid: 0, amount_due: 14900, currency: 'usd', created: 1757000000 }] });
    expect(await getBillingHistory('org')).toMatchObject({
      provider: 'stripe', manageAction: 'stripe_portal',
      entries: [{ id: 'in_test', amountCents: 14900, currency: 'USD', status: 'open' }],
    });
    expect(m.invoices).toHaveBeenCalledWith({ customer: 'cus_test', limit: 50 });
  });
  it('does not turn provider failures into an empty history', async () => {
    m.subscription.mockResolvedValue({ stripeCustomerId: 'cus_test' });
    m.invoices.mockRejectedValue(new Error('test outage'));
    await expect(getBillingHistory('org')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
});
