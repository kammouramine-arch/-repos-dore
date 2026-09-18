import { APPLE_PRODUCTS } from './apple-products';
import { formatEurosPlain } from './money';
import { LAUNCH_PRICING_LIVE, PLANS, effectiveMonthlyPriceCents, type PlanId } from './plans';

/**
 * Prix publics par vitrine App Store, utilisés en repli.
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
 *
 * Les montants sont **dérivés** de `plans.ts` plutôt que recopiés. C'est la
 * seule façon d'éviter la panne d'août : deux tables de prix qui divergent,
 * et une application qui annonce un tarif que le magasin ne pratique pas.
 * Tant que `LAUNCH_PRICING_LIVE` est faux, le repli affiche 39 / 79 / 149 €,
 * c'est-à-dire ce qu'App Store Connect facture réellement aujourd'hui. Une
 * fois les trois produits repricés chez Apple et le drapeau levé, le repli
 * suit sans qu'aucun nombre ne soit retouché ici.
 */
export interface StorefrontPrice {
  displayPrice: string;
  currency: string;
  period: 'month';
}

function franceTable(): Record<string, StorefrontPrice> {
  const entries = (Object.keys(PLANS) as PlanId[]).map((plan) => [
    APPLE_PRODUCTS[plan],
    { displayPrice: formatEurosPlain(effectiveMonthlyPriceCents(plan)), currency: 'EUR', period: 'month' as const },
  ]);
  return Object.fromEntries(entries) as Record<string, StorefrontPrice>;
}

export const STOREFRONT_FALLBACK_PRICES: Readonly<Record<string, Readonly<Record<string, StorefrontPrice>>>> = {
  FRA: franceTable(),
};

/** Prix de repli pour une vitrine et un produit connus ; null sinon. */
export function storefrontFallbackPrice(storefront: string | null | undefined, productId: string | null | undefined): StorefrontPrice | null {
  if (!storefront || !productId) return null;
  return STOREFRONT_FALLBACK_PRICES[storefront.toUpperCase()]?.[productId] ?? null;
}

/**
 * Le repli annonce-t-il le tarif de lancement ?
 *
 * Exporté pour les tests et le diagnostic : il ne doit jamais être vrai tant
 * qu'App Store Connect n'a pas été reprisé.
 */
export const STOREFRONT_FALLBACK_USES_LAUNCH_PRICING = LAUNCH_PRICING_LIVE;
