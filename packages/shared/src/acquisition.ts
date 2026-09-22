/** Only these fields may cross the app-to-Meta boundary. No customer/job data. */
export interface AcquisitionEvent {
  id: string;
  name: 'fb_mobile_complete_registration' | 'StartTrial' | 'fb_mobile_purchase';
  productId?: string;
  value?: number;
  currency?: string;
}

/** Pure policy, called only after signature, bundle and ownership verification. */
export function appleAcquisition(t: {
  environment?: string; transactionId?: string; originalTransactionId?: string;
  productId?: string; purchaseDate?: number; expiresDate?: number;
  revocationDate?: number; isUpgraded?: boolean; type?: string;
  offerType?: number; offerDiscountType?: string; price?: number; currency?: string;
}, now: number): Omit<AcquisitionEvent, 'id'> | null {
  if (t.environment !== 'Production' || !t.transactionId || !t.productId ||
      t.type !== 'Auto-Renewable Subscription' || t.revocationDate || t.isUpgraded ||
      !t.purchaseDate || !t.expiresDate || t.expiresDate <= now ||
      t.purchaseDate > now || now - t.purchaseDate > 24 * 60 * 60 * 1000) return null;
  if (t.offerType === 1 && t.offerDiscountType === 'FREE_TRIAL') {
    // This campaign measures the seven-day offer, never an inferred local trial.
    if (t.expiresDate - t.purchaseDate !== 7 * 24 * 60 * 60 * 1000) return null;
    return { name: 'StartTrial', productId: t.productId };
  }
  if (!Number.isSafeInteger(t.price) || t.price! <= 0 || !/^[A-Z]{3}$/.test(t.currency ?? '')) return null;
  // Apple's signed price is in milliunits, not cents. Zero-value invoices are not revenue.
  return { name: 'fb_mobile_purchase', productId: t.productId, value: t.price! / 1000, currency: t.currency };
}
