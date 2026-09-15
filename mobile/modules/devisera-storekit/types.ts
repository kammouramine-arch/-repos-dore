/** Raw StoreKit 2 answer, read without the purchase library. Catalogue data only. */
export interface NativeStorekitOffer {
  currencyCode?: string;
  price?: string;
  priceFormatted?: string;
  recurringSubscriptionPeriod?: string;
  type?: string;
  buyParams?: string;
  discounts?: { type?: string; modeType?: string; price?: string; priceFormatted?: string; numOfPeriods?: string; recurringSubscriptionPeriod?: string }[];
}

export interface NativeStorekitProduct {
  id: string;
  type: string;
  displayName: string;
  displayPrice: string;
  price: string;
  currency: string;
  priceLocale: string;
  isFamilyShareable: boolean;
  subscriptionGroupId?: string;
  periodUnit?: string;
  periodValue?: number;
  introEligible?: boolean;
  intro?: { paymentMode: string; displayPrice: string; periodUnit: string; periodValue: number; periodCount: number } | null;
  catalog: { parsed: boolean; href?: string; topLevelKeys?: string[]; attributeKeys?: string[]; offers?: NativeStorekitOffer[] };
}

export interface NativeStorekitInspection {
  storefrontCountry: string;
  storefrontId: string;
  requestedProductIds: string[];
  missingProductIds: string[];
  products: NativeStorekitProduct[];
  inspectedAt: string;
}
