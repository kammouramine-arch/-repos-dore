import { PurchasesUnavailableError, type PurchaseAdapter } from './types';

const EXPLANATION =
  'In-app purchases need a native billing library and store products, which are configured at release time. See docs/BILLING.md.';

/**
 * The adapter used when no billing SDK is installed. Every call fails loudly and
 * explains why — the paywall shows that explanation rather than a button that
 * silently does nothing.
 */
export const unavailableAdapter: PurchaseAdapter = {
  id: 'unavailable',
  isAvailable: () => false,
  async init() {},
  async getProducts() {
    return [];
  },
  async purchase() {
    throw new PurchasesUnavailableError(EXPLANATION);
  },
  async restore() {
    throw new PurchasesUnavailableError(EXPLANATION);
  },
};
