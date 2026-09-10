import { APPLE_PRODUCTS } from './apple-products';

/**
 * Prix publics vérifiés par vitrine App Store.
 *
 * Repli de vitrine, pas un tarif inventé : ces montants sont ceux qu'Apple
 * affiche lui-même dans son écran natif de gestion d'abonnement pour la
 * vitrine française (vérifié sur appareil le 10/09/2026, dossier Apple
 * 102957593166). Ils ne servent QUE lorsque les métadonnées produit reçues
 * de StoreKit contredisent la vitrine de l'appareil (FRA + USD). Dès que
 * StoreKit renvoie une devise cohérente, `displayPrice` reprend la main et ce
 * fichier n'est plus lu. Aucune conversion n'est jamais calculée à partir
 * d'un montant en dollars. La feuille d'achat Apple reste seule autorité au
 * paiement.
 */
export interface StorefrontPrice {
  displayPrice: string;
  currency: string;
  period: 'month';
}

export const STOREFRONT_FALLBACK_PRICES: Readonly<Record<string, Readonly<Record<string, StorefrontPrice>>>> = {
  FRA: {
    [APPLE_PRODUCTS.ESSENTIEL]: { displayPrice: '39,00 €', currency: 'EUR', period: 'month' },
    [APPLE_PRODUCTS.PRO]: { displayPrice: '79,00 €', currency: 'EUR', period: 'month' },
    [APPLE_PRODUCTS.ENTREPRISE]: { displayPrice: '149,00 €', currency: 'EUR', period: 'month' },
  },
};

/** Prix de repli pour une vitrine et un produit connus ; null sinon. */
export function storefrontFallbackPrice(storefront: string | null | undefined, productId: string | null | undefined): StorefrontPrice | null {
  if (!storefront || !productId) return null;
  return STOREFRONT_FALLBACK_PRICES[storefront.toUpperCase()]?.[productId] ?? null;
}
