import { describe, expect, it } from 'vitest';
import { applePurchaseUserMessage, normalizeApplePurchaseError } from '@devisia/shared';

describe('Apple purchase diagnostics', () => {
  it.each([
    [{ code: 'TRANSACTION_TIMEOUT' }, 'timeout'],
    [{ code: 'VALIDATION', status: 422 }, 'verification'],
    [{ code: 'FORBIDDEN', status: 403 }, 'verification'],
    [{ code: 'PAYMENT_PENDING' }, 'pending'],
    [{ code: 'product-unavailable' }, 'product'],
    [{ code: 'storefront-unavailable' }, 'storefront'],
  ])('distinguishes failure families without exposing provider messages', (error, category) => {
    const diagnostic = normalizeApplePurchaseError(error);
    expect(diagnostic.category).toBe(category);
    expect(applePurchaseUserMessage(diagnostic, 'en')).toBeTruthy();
  });
  it('keeps the native code and safe product/storefront context', () => {
    expect(normalizeApplePurchaseError({
      code: 'E_STOREKIT_PAYMENT_NOT_ALLOWED',
      message: 'Payments are not allowed on this device',
      productId: 'fr.devisera.pro.monthly',
    }, { storefront: 'FRA', transactionState: 'purchased' })).toEqual({
      category: 'storekit',
      code: 'E_STOREKIT_PAYMENT_NOT_ALLOWED',
      message: 'Payments are not allowed on this device',
      productId: 'fr.devisera.pro.monthly',
      storefront: 'FRA',
      transactionState: 'purchased',
    });
  });

  it('classifies cancellation without showing an error alert', () => {
    const diagnostic = normalizeApplePurchaseError({ code: 'user-cancelled', message: 'The user cancelled the purchase.' });
    expect(diagnostic.category).toBe('cancelled');
    expect(applePurchaseUserMessage(diagnostic, 'en')).toBeNull();
  });

  it('provides a localized, non-sensitive message for network errors', () => {
    const diagnostic = normalizeApplePurchaseError({ code: 'network-error', message: 'Cannot connect to App Store' });
    expect(applePurchaseUserMessage(diagnostic, 'fr')).toContain('App Store');
  });
});
