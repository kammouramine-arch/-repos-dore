import { describe, expect, it } from 'vitest';
import { catalogStorefront, compareStorekitSources, describeStorekitComparison, storefrontCurrency } from '../../mobile/src/lib/storekit-compare';
import type { NativeStorekitInspection } from '../../mobile/modules/devisera-storekit/types';

const usd = (id: string, price: string) => ({
  id, type: 'autoRenewable', displayName: 'DEVISERA', displayPrice: `$${price}`, price, currency: 'USD', priceLocale: 'en_US@currency=USD', isFamilyShareable: false,
  intro: null, introEligible: true,
  catalog: { parsed: true, href: `/v1/catalog/us/in-apps/${id}`, offers: [{ currencyCode: 'USD', price, priceFormatted: `$${price}` }] },
});
const eur = (id: string, price: string) => ({
  ...usd(id, price), displayPrice: `${price.replace('.', ',')} €`, currency: 'EUR', priceLocale: 'fr_FR@currency=EUR',
  intro: { paymentMode: 'freeTrial', displayPrice: '0,00 €', periodUnit: 'day', periodValue: 3, periodCount: 1 },
  catalog: { parsed: true, href: `/v1/catalog/fr/in-apps/${id}`, offers: [{ currencyCode: 'EUR', price, priceFormatted: `${price} €`, discounts: [{ type: 'IntroOffer', modeType: 'FreeTrial' }] }] },
});
const inspection = (products: NativeStorekitInspection['products'], storefront = 'FRA'): NativeStorekitInspection => ({
  storefrontCountry: storefront, storefrontId: '143442', requestedProductIds: ['fr.devisia.essentiel.monthly', 'fr.devisia.pro.monthly'],
  missingProductIds: [], products, inspectedAt: '2026-09-10T00:00:00Z',
});

describe('StoreKit layer comparison', () => {
  it('maps storefronts to an expected currency and reads the catalogue storefront from the href', () => {
    expect(storefrontCurrency('FRA')).toBe('EUR');
    expect(storefrontCurrency('unknown')).toBeNull();
    expect(catalogStorefront('/v1/catalog/us/in-apps/123')).toBe('US');
    expect(catalogStorefront(null)).toBeNull();
  });
  it('reports MATCH when the library and StoreKit agree with the storefront', () => {
    const [c] = compareStorekitSources([{ id: 'fr.devisia.essentiel.monthly', displayPrice: '39,00 €', currency: 'EUR' }], inspection([eur('fr.devisia.essentiel.monthly', '39.00')]));
    expect(c).toMatchObject({ verdict: 'MATCH', catalogCurrency: 'EUR', catalogIntroOffer: true, nativeIntroOffer: true });
  });
  it('blames the library only when StoreKit itself returns something else', () => {
    const [c] = compareStorekitSources([{ id: 'fr.devisia.essentiel.monthly', displayPrice: '$35.00', currency: 'USD' }], inspection([eur('fr.devisia.essentiel.monthly', '39.00')]));
    expect(c.verdict).toBe('WRAPPER_DIFFERS_FROM_NATIVE');
    expect(describeStorekitComparison(c, false)).toContain('La divergence est dans la bibliothèque');
  });
  it('locates a USD answer on a FRA storefront below the library, in Apple’s catalogue answer', () => {
    const [c] = compareStorekitSources([{ id: 'fr.devisia.essentiel.monthly', displayPrice: '$35.00', currency: 'USD' }], inspection([usd('fr.devisia.essentiel.monthly', '35.00')]));
    expect(c).toMatchObject({ verdict: 'CATALOG_CURRENCY_DIFFERS_FROM_STOREFRONT', expectedCurrency: 'EUR', catalogCurrency: 'USD', catalogPath: '/v1/catalog/us/in-apps/fr.devisia.essentiel.monthly', catalogIntroOffer: false });
    expect(describeStorekitComparison(c, true)).toContain('catalogue served for US');
    expect(describeStorekitComparison(c, true)).toContain("inside Apple's catalogue answer");
  });
  it('never rewrites, converts or invents an amount', () => {
    const rows = compareStorekitSources([{ id: 'fr.devisia.pro.monthly', displayPrice: '$69.00', currency: 'USD' }], inspection([usd('fr.devisia.pro.monthly', '69.00')]));
    expect(JSON.stringify(rows)).not.toMatch(/79|€/);
  });
  it('flags products missing on either side', () => {
    const rows = compareStorekitSources([{ id: 'fr.devisia.pro.monthly', displayPrice: '79,00 €', currency: 'EUR' }], inspection([eur('fr.devisia.essentiel.monthly', '39.00')]));
    expect(rows.find((r) => r.productId === 'fr.devisia.pro.monthly')?.verdict).toBe('NATIVE_MISSING');
    expect(rows.find((r) => r.productId === 'fr.devisia.essentiel.monthly')?.verdict).toBe('WRAPPER_MISSING');
  });
});
