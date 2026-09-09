import type { Diagnostic } from './diagnostics';

/** Explicit allowlist: never export arbitrary SDK payloads or purchase events. */
export function storekitReportEvents(events: Diagnostic[]) {
  return events.filter(e => e.path === 'apple-products').map(e => ({
    at: e.at, code: e.code, category: e.category, durationMs: e.durationMs,
    storefront: e.storefront, requestedProductIds: e.requestedProductIds,
    returnedProductIds: e.returnedProductIds, missingProductIds: e.missingProductIds,
    productCount: e.productCount, productId: e.productId, displayPrice: e.displayPrice,
    currency: e.currency, subscriptionPeriodUnit: e.subscriptionPeriodUnit,
    subscriptionPeriodCount: e.subscriptionPeriodCount, introPaymentMode: e.introPaymentMode,
    introPeriod: e.introPeriod, introPeriodCount: e.introPeriodCount,
    introPrice: e.introPrice, introEligible: e.introEligible,
    nativeCode: e.nativeCode, cachePolicy: e.cachePolicy,
  }));
}
