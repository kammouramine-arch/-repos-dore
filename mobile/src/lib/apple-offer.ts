import type { ProductSubscription } from 'expo-iap';

/** No web/fallback price argument: only the latest native product is usable. */
export function appleOffer(product: ProductSubscription | undefined, eligible: boolean, en: boolean, storefront = '') {
  const mismatch = !!product && !consistentAppleCurrency([product], storefront);
  const ios = product?.platform === 'ios' ? product : undefined;
  const units = { day: en ? 'day' : 'jour', week: en ? 'week' : 'semaine', month: en ? 'month' : 'mois', year: en ? 'year' : 'an' };
  const unit = ios?.subscriptionPeriodUnitIOS;
  const count = Number(ios?.subscriptionPeriodNumberIOS);
  const period = unit && unit in units && count > 0
    ? `/ ${count === 1 ? '' : `${count} `}${units[unit as keyof typeof units]}` : '';
  const trialUnit = ios?.introductoryPriceSubscriptionPeriodIOS;
  const days = Number(ios?.introductoryPriceNumberOfPeriodsIOS) * (trialUnit === 'day' ? 1 : trialUnit === 'week' ? 7 : 0);
  const trial = !mismatch && eligible && ios?.introductoryPricePaymentModeIOS === 'free-trial' && days > 0;
  return { price: mismatch ? null : product?.displayPrice || null, period: mismatch ? '' : period, trial, days, mismatch,
    note: trial ? (en ? `${days} days free` : `${days} jours gratuits`) : null };
}

/** Detect stale native metadata, never convert or substitute amounts. */
export function consistentAppleCurrency(products: { currency?: string | null }[], storefront: string) {
  const expected: Record<string, string> = { FRA: 'EUR', FR: 'EUR', GBR: 'GBP', GB: 'GBP', USA: 'USD', US: 'USD' };
  const currency = expected[storefront.toUpperCase()];
  return !currency || products.every(product => product.currency === currency);
}
