import type { ProductSubscription } from 'expo-iap';
import { storefrontFallbackPrice } from '@devisia/shared';

export type AppleOfferSource = 'apple' | 'storefront-fallback' | null;

/**
 * Présentation d'une offre Apple.
 *
 * Source 'apple' : le `displayPrice` natif, tel quel. Source
 * 'storefront-fallback' : la métadonnée reçue contredit la vitrine de
 * l'appareil (FRA + USD, dossier Apple 102957593166) ; on affiche alors le
 * prix public vérifié de cette vitrine, jamais une conversion. L'essai n'est
 * annoncé que sur métadonnées cohérentes : Apple confirme l'éligibilité et le
 * prix avant tout accord.
 */
export function appleOffer(product: ProductSubscription | undefined, eligible: boolean, en: boolean, storefront = '') {
  const mismatch = !!product && !consistentAppleCurrency([product], storefront);
  const fallback = mismatch ? storefrontFallbackPrice(storefront, product?.id) : null;
  const ios = product?.platform === 'ios' ? product : undefined;
  const units = { day: en ? 'day' : 'jour', week: en ? 'week' : 'semaine', month: en ? 'month' : 'mois', year: en ? 'year' : 'an' };
  const unit = ios?.subscriptionPeriodUnitIOS;
  const count = Number(ios?.subscriptionPeriodNumberIOS);
  const period = unit && unit in units && count > 0
    ? `/ ${count === 1 ? '' : `${count} `}${units[unit as keyof typeof units]}` : '';
  const trialUnit = ios?.introductoryPriceSubscriptionPeriodIOS;
  const days = Number(ios?.introductoryPriceNumberOfPeriodsIOS) * (trialUnit === 'day' ? 1 : trialUnit === 'week' ? 7 : 0);
  const trial = !mismatch && eligible && ios?.introductoryPricePaymentModeIOS === 'free-trial' && days > 0;
  const source: AppleOfferSource = !product ? null : !mismatch ? 'apple' : fallback ? 'storefront-fallback' : null;
  return {
    price: source === 'apple' ? product?.displayPrice || null : source === 'storefront-fallback' ? fallback!.displayPrice : null,
    period: source === 'apple' ? period : source === 'storefront-fallback' ? `/ ${units[fallback!.period]}` : '',
    trial, days, mismatch, source,
    note: trial ? (en ? `${days} days free` : `${days} jours gratuits`) : null,
  };
}

/** Detect stale native metadata, never convert or substitute amounts. */
export function consistentAppleCurrency(products: { currency?: string | null }[], storefront: string) {
  const expected: Record<string, string> = { FRA: 'EUR', FR: 'EUR', GBR: 'GBP', GB: 'GBP', USA: 'USD', US: 'USD' };
  const currency = expected[storefront.toUpperCase()];
  return !currency || products.every(product => product.currency === currency);
}
