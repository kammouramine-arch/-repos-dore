import { describe, expect, it } from 'vitest';
import { mapStripeInvoice } from '@/server/services/billingHistoryService';

describe('billing history provider mapping', () => {
  it('maps only real Stripe invoice data and keeps the receipt link', () => {
    const entry = mapStripeInvoice({
      id: 'in_test',
      created: 1_757_000_000,
      amount_paid: 7900,
      amount_due: 7900,
      currency: 'eur',
      status: 'paid',
      number: 'INV-2026-0001',
      hosted_invoice_url: 'https://invoice.stripe.test/in_test',
      invoice_pdf: null,
      status_transitions: { paid_at: 1_757_000_100 },
    } as never);
    expect(entry).toMatchObject({
      id: 'in_test', amountCents: 7900, currency: 'EUR', status: 'paid',
      receiptUrl: 'https://invoice.stripe.test/in_test',
      description: 'DEVISERA · INV-2026-0001',
    });
    expect(entry.date).toBe(new Date(1_757_000_100 * 1000).toISOString());
  });
});
