import type { NativeStorekitInspection } from '../../modules/devisera-storekit/types';

/**
 * Comparaison couche par couche du prix d'un produit Apple.
 *
 * Trois sources pour un même identifiant : ce que la bibliothèque d'achat
 * (expo-iap/openiap) a renvoyé, ce que StoreKit 2 renvoie en direct, et
 * l'entrée brute du catalogue App Store dont StoreKit a construit le produit.
 * Le verdict dit où la divergence apparaît. Aucun montant n'est corrigé,
 * converti ni remplacé : on décrit, on ne fabrique pas.
 */
export type StorekitVerdict =
  | 'MATCH'
  | 'WRAPPER_DIFFERS_FROM_NATIVE'
  | 'CATALOG_CURRENCY_DIFFERS_FROM_STOREFRONT'
  | 'NATIVE_MISSING'
  | 'WRAPPER_MISSING';

export interface StorekitComparison {
  productId: string;
  storefront: string;
  expectedCurrency: string | null;
  wrapperDisplayPrice: string | null;
  wrapperCurrency: string | null;
  nativeDisplayPrice: string | null;
  nativeCurrency: string | null;
  nativePriceLocale: string | null;
  catalogCurrency: string | null;
  catalogPriceFormatted: string | null;
  catalogPath: string | null;
  catalogIntroOffer: boolean | null;
  nativeIntroOffer: boolean | null;
  verdict: StorekitVerdict;
}

const STOREFRONT_CURRENCY: Record<string, string> = { FRA: 'EUR', FR: 'EUR', GBR: 'GBP', GB: 'GBP', USA: 'USD', US: 'USD' };

/** Devise attendue pour une vitrine connue ; null si on ne veut rien supposer. */
export function storefrontCurrency(storefront: string | null | undefined) {
  return STOREFRONT_CURRENCY[(storefront ?? '').toUpperCase()] ?? null;
}

/** Vitrine servie par le catalogue, lue dans le chemin `/v1/catalog/<pays>/…`. */
export function catalogStorefront(href: string | null | undefined) {
  const match = /\/catalog\/([a-z]{2})\//i.exec(href ?? '');
  return match ? match[1]!.toUpperCase() : null;
}

export function compareStorekitSources(
  wrapper: { id: string; displayPrice?: string | null; currency?: string | null }[],
  native: NativeStorekitInspection,
): StorekitComparison[] {
  const ids = Array.from(new Set([...native.requestedProductIds, ...wrapper.map((p) => p.id), ...native.products.map((p) => p.id)]));
  const expected = storefrontCurrency(native.storefrontCountry);
  return ids.map((productId) => {
    const w = wrapper.find((p) => p.id === productId);
    const n = native.products.find((p) => p.id === productId);
    const offer = n?.catalog.offers?.[0];
    const intro = offer ? (offer.discounts ?? []).some((d) => d.type === 'IntroOffer') : null;
    let verdict: StorekitVerdict = 'MATCH';
    if (!n) verdict = 'NATIVE_MISSING';
    else if (!w) verdict = 'WRAPPER_MISSING';
    else if ((w.displayPrice ?? '') !== n.displayPrice || (w.currency ?? '') !== n.currency) verdict = 'WRAPPER_DIFFERS_FROM_NATIVE';
    else if (expected && (offer?.currencyCode ?? n.currency) !== expected) verdict = 'CATALOG_CURRENCY_DIFFERS_FROM_STOREFRONT';
    return {
      productId,
      storefront: native.storefrontCountry,
      expectedCurrency: expected,
      wrapperDisplayPrice: w?.displayPrice ?? null,
      wrapperCurrency: w?.currency ?? null,
      nativeDisplayPrice: n?.displayPrice ?? null,
      nativeCurrency: n?.currency ?? null,
      nativePriceLocale: n?.priceLocale ?? null,
      catalogCurrency: offer?.currencyCode ?? null,
      catalogPriceFormatted: offer?.priceFormatted ?? null,
      catalogPath: n?.catalog.href ?? null,
      catalogIntroOffer: n ? intro : null,
      nativeIntroOffer: n ? n.intro != null : null,
      verdict,
    };
  });
}

/** Une phrase par produit, pour le rapport de support et le dossier Apple. */
export function describeStorekitComparison(c: StorekitComparison, en: boolean) {
  const served = catalogStorefront(c.catalogPath);
  const where = served ? (en ? ` (catalogue served for ${served})` : ` (catalogue servi pour ${served})`) : '';
  switch (c.verdict) {
    case 'MATCH': return en ? `${c.productId}: library and StoreKit agree on ${c.nativeDisplayPrice} ${c.nativeCurrency}${where}.` : `${c.productId} : bibliothèque et StoreKit concordent sur ${c.nativeDisplayPrice} ${c.nativeCurrency}${where}.`;
    case 'WRAPPER_DIFFERS_FROM_NATIVE': return en ? `${c.productId}: the purchase library returned ${c.wrapperDisplayPrice} ${c.wrapperCurrency} but StoreKit returns ${c.nativeDisplayPrice} ${c.nativeCurrency}${where}. The discrepancy is in the library.` : `${c.productId} : la bibliothèque d’achat a renvoyé ${c.wrapperDisplayPrice} ${c.wrapperCurrency} mais StoreKit renvoie ${c.nativeDisplayPrice} ${c.nativeCurrency}${where}. La divergence est dans la bibliothèque.`;
    case 'CATALOG_CURRENCY_DIFFERS_FROM_STOREFRONT': return en ? `${c.productId}: StoreKit itself returns ${c.nativeDisplayPrice} ${c.nativeCurrency}${where} while the device storefront is ${c.storefront} (${c.expectedCurrency}). The discrepancy is inside Apple's catalogue answer, below the library.` : `${c.productId} : StoreKit lui-même renvoie ${c.nativeDisplayPrice} ${c.nativeCurrency}${where} alors que la vitrine de l’appareil est ${c.storefront} (${c.expectedCurrency}). La divergence est dans la réponse catalogue d’Apple, sous la bibliothèque.`;
    case 'NATIVE_MISSING': return en ? `${c.productId}: StoreKit returned no product for this identifier on storefront ${c.storefront}.` : `${c.productId} : StoreKit n’a renvoyé aucun produit pour cet identifiant sur la vitrine ${c.storefront}.`;
    case 'WRAPPER_MISSING': return en ? `${c.productId}: StoreKit returns the product but the purchase library dropped it.` : `${c.productId} : StoreKit renvoie le produit mais la bibliothèque d’achat l’a écarté.`;
  }
}
