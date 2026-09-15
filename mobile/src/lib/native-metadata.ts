import type { ProductOrSubscription, ProductSubscription } from 'expo-iap';
import type { NativeStorekitInspection, NativeStorekitProduct } from '../../modules/devisera-storekit/types';
import { consistentAppleCurrency } from './apple-offer';

/**
 * Métadonnées StoreKit 2 lues en direct, mises à la forme de la bibliothèque.
 *
 * Utilisées seulement quand la réponse de la bibliothèque contredit la vitrine
 * de l'appareil ET que la lecture directe, elle, y est conforme. Chaque
 * montant vient tel quel de `Product.displayPrice` ; rien n'est converti,
 * arrondi ni complété. Si la lecture directe est absente ou contredit aussi la
 * vitrine, on ne remplace rien.
 */
const PAYMENT_MODES: Record<string, string> = { freeTrial: 'free-trial', 'free-trial': 'free-trial', payAsYouGo: 'pay-as-you-go', 'pay-as-you-go': 'pay-as-you-go', payUpFront: 'pay-up-front', 'pay-up-front': 'pay-up-front' };

export function nativeToWrapperProduct(base: ProductOrSubscription | undefined, native: NativeStorekitProduct): ProductSubscription {
  const intro = native.intro;
  const periods = intro ? intro.periodValue * intro.periodCount : null;
  return {
    ...(base ?? { id: native.id, platform: 'ios', type: 'subs', title: native.displayName, description: '' }),
    id: native.id,
    platform: 'ios',
    displayPrice: native.displayPrice,
    currency: native.currency,
    price: Number(native.price),
    displayNameIOS: native.displayName,
    subscriptionPeriodUnitIOS: native.periodUnit,
    subscriptionPeriodNumberIOS: native.periodValue != null ? String(native.periodValue) : undefined,
    introductoryPriceIOS: intro?.displayPrice,
    introductoryPricePaymentModeIOS: intro ? PAYMENT_MODES[intro.paymentMode] ?? intro.paymentMode : '',
    introductoryPriceNumberOfPeriodsIOS: periods != null ? String(periods) : undefined,
    introductoryPriceSubscriptionPeriodIOS: intro?.periodUnit,
  } as unknown as ProductSubscription;
}

export function adoptNativeMetadata(wrapper: ProductOrSubscription[], inspection: NativeStorekitInspection, storefront: string): ProductSubscription[] | null {
  const native = inspection.products.filter(p => p.displayPrice && p.currency);
  if (!native.length) return null;
  if (!consistentAppleCurrency(native, inspection.storefrontCountry || storefront)) return null;
  if (inspection.storefrontCountry && storefront !== 'unknown' && inspection.storefrontCountry !== storefront) return null;
  return native.map(p => nativeToWrapperProduct(wrapper.find(w => w.id === p.id), p));
}
