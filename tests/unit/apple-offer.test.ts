import { describe, expect, it } from 'vitest';
const modulePath = '../../mobile/src/lib/apple-offer';
const { appleOffer, consistentAppleCurrency } = await import(modulePath);
const eur = { platform: 'ios', displayPrice: '39,00 €', currency: 'EUR', subscriptionPeriodNumberIOS: '1', subscriptionPeriodUnitIOS: 'month', introductoryPricePaymentModeIOS: 'free-trial', introductoryPriceNumberOfPeriodsIOS: '3', introductoryPriceSubscriptionPeriodIOS: 'day' };
describe('Apple-only offer presentation', () => {
  it('shows the verified France storefront price when Apple metadata contradicts a FRA storefront, never a conversion', () => {
    const usd = { ...eur, id: 'fr.devisia.essentiel.monthly', currency: 'USD', displayPrice: '$35.00' };
    expect(appleOffer(usd, true, false, 'FRA')).toMatchObject({ price: '39,00 €', period: '/ mois', mismatch: true, trial: false, source: 'storefront-fallback' });
    expect(appleOffer({ ...usd, id: 'fr.devisia.pro.monthly', displayPrice: '$69.00' }, true, true, 'FRA')).toMatchObject({ price: '79,00 €', period: '/ month', source: 'storefront-fallback' });
    expect(appleOffer({ ...usd, id: 'fr.devisia.entreprise.monthly', displayPrice: '$129.00' }, true, false, 'FRA')).toMatchObject({ price: '149,00 €', source: 'storefront-fallback' });
    // Coherent Apple metadata always wins over the fallback.
    expect(appleOffer({ ...eur, id: 'fr.devisia.essentiel.monthly' }, true, false, 'FRA')).toMatchObject({ price: '39,00 €', mismatch: false, trial: true, source: 'apple' });
    // No verified price for that storefront or product: nothing is shown.
    expect(appleOffer({ ...usd, id: 'unknown.product' }, true, false, 'FRA')).toMatchObject({ price: null, source: null });
    expect(appleOffer({ ...eur, currency: 'USD', displayPrice: '$35.00', id: 'fr.devisia.essentiel.monthly' }, true, false, 'GBR')).toMatchObject({ price: null, source: null });
  });
  it('keeps the fallback table typed, centralised and free of arithmetic', async () => {
    const shared = await import('../../packages/shared/src/apple-storefront-prices');
    expect(shared.storefrontFallbackPrice('fra', 'fr.devisia.pro.monthly')).toEqual({ displayPrice: '79,00 €', currency: 'EUR', period: 'month' });
    expect(shared.storefrontFallbackPrice('USA', 'fr.devisia.pro.monthly')).toBeNull();
    expect(shared.storefrontFallbackPrice('FRA', null)).toBeNull();
    const { readFileSync } = await import('node:fs');
    const code = readFileSync('packages/shared/src/apple-storefront-prices.ts', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/[*\/]\s*[0-9.]+|parseFloat|toFixed|rate/i);
    expect(readFileSync('mobile/src/lib/apple-offer.ts', 'utf8')).not.toMatch(/parseFloat|toFixed|exchange|rate\b/i);
  });
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
