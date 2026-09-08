import { describe, expect, it } from 'vitest';
const modulePath = '../../mobile/src/lib/apple-offer';
const { appleOffer, consistentAppleCurrency } = await import(modulePath);
const eur = { platform: 'ios', displayPrice: '39,00 €', currency: 'EUR', subscriptionPeriodNumberIOS: '1', subscriptionPeriodUnitIOS: 'month', introductoryPricePaymentModeIOS: 'free-trial', introductoryPriceNumberOfPeriodsIOS: '3', introductoryPriceSubscriptionPeriodIOS: 'day' };
describe('Apple-only offer presentation', () => {
  it.each([['$35.00', '39,00 €'], ['$69.00', '79,00 €'], ['$129.00', '149,00 €']])('replaces %s with current Apple %s', (oldPrice, currentPrice) => {
    const stale = { ...eur, displayPrice: oldPrice, currency: 'USD' };
    expect(appleOffer(stale, false, false).price).toBe(oldPrice);
    expect(appleOffer({ ...eur, displayPrice: currentPrice }, false, false).price).toBe(currentPrice);
  });
  it('replaces a prior USD product with current EUR without a fallback', () => {
    expect(appleOffer({ ...eur, displayPrice: '$35.00', currency: 'USD' }, false, false).price).toBe('$35.00');
    expect(appleOffer(eur, false, false).price).toBe('39,00 €');
    expect(appleOffer(undefined, false, false).price).toBeNull();
  });
  it('never advertises a trial when ineligible or metadata absent', () => {
    expect(appleOffer(eur, false, true).note).toBeNull();
    expect(appleOffer(undefined, true, true).trial).toBe(false);
    expect(appleOffer(eur, true, true)).toMatchObject({ days: 3, note: '3 days free', period: '/ month' });
  });
  it('rejects stale USD metadata for a current France storefront without conversion', () => {
    expect(consistentAppleCurrency([{ currency: 'USD' }], 'FRA')).toBe(false);
    expect(consistentAppleCurrency([eur], 'FRA')).toBe(true);
  });
});
