import { APPLE_PRODUCTS } from '@devisia/shared';
import { inspectNativeStorekit, nativeStorekitAvailable } from '../../modules/devisera-storekit';
import type { NativeStorekitInspection } from '../../modules/devisera-storekit/types';
import { recordDiagnostic } from './diagnostics';
import { compareStorekitSources, type StorekitComparison } from './storekit-compare';

/**
 * Lecture StoreKit 2 directe, journalisée à côté de la lecture expo-iap.
 *
 * Elle ne participe jamais à l'affichage des prix ni à l'achat : c'est une
 * preuve, pas une source. Si la version installée n'embarque pas le module
 * natif (ancien binaire, web), on l'écrit dans le journal et on s'arrête.
 */
export async function inspectAndCompareStorekit(
  wrapper: { id: string; displayPrice?: string | null; currency?: string | null }[],
): Promise<{ inspection: NativeStorekitInspection; comparisons: StorekitComparison[] } | null> {
  const started = Date.now();
  if (!(await nativeStorekitAvailable())) {
    recordDiagnostic({ area: 'billing', path: 'native-storekit', code: 'NATIVE_STOREKIT_UNAVAILABLE', category: 'client', durationMs: 0 });
    return null;
  }
  try {
    const inspection = await inspectNativeStorekit(Object.values(APPLE_PRODUCTS));
    const comparisons = compareStorekitSources(wrapper, inspection);
    recordDiagnostic({ area: 'billing', path: 'native-storekit', code: 'NATIVE_STOREKIT_RETURNED', category: 'ok', durationMs: Date.now() - started,
      storefront: inspection.storefrontCountry, storefrontId: inspection.storefrontId, requestedProductIds: inspection.requestedProductIds,
      returnedProductIds: inspection.products.map((p) => p.id), missingProductIds: inspection.missingProductIds, productCount: inspection.products.length });
    for (const c of comparisons) {
      recordDiagnostic({ area: 'billing', path: 'native-storekit', code: `NATIVE_STOREKIT_${c.verdict}`, category: c.verdict === 'MATCH' ? 'ok' : 'client', durationMs: 0,
        productId: c.productId, storefront: c.storefront, displayPrice: c.wrapperDisplayPrice ?? undefined, currency: c.wrapperCurrency ?? undefined,
        nativeDisplayPrice: c.nativeDisplayPrice, nativeCurrency: c.nativeCurrency, nativePriceLocale: c.nativePriceLocale,
        catalogCurrency: c.catalogCurrency, catalogPriceFormatted: c.catalogPriceFormatted, catalogPath: c.catalogPath,
        catalogIntroOffer: c.catalogIntroOffer, nativeIntroOffer: c.nativeIntroOffer, expectedCurrency: c.expectedCurrency });
    }
    return { inspection, comparisons };
  } catch (error) {
    const code = error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : 'UNKNOWN';
    recordDiagnostic({ area: 'billing', path: 'native-storekit', code: 'NATIVE_STOREKIT_FAILED', category: 'client', durationMs: Date.now() - started, nativeCode: code });
    return null;
  }
}
