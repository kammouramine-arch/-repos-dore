/**
 * Safe, platform-neutral StoreKit diagnostics.
 *
 * expo-iap exposes slightly different error shapes between iOS releases. We
 * intentionally keep this helper free of React Native imports so the server,
 * mobile client and unit tests can share the same classification without ever
 * serialising receipts, tokens or credentials.
 */

export type ApplePurchaseErrorCategory = 'cancelled' | 'storekit' | 'network' | 'unknown' | 'timeout' | 'verification' | 'product' | 'storefront' | 'pending';

export interface ApplePurchaseContext {
  productId?: string | null;
  storefront?: string | null;
  transactionState?: string | null;
}

export interface ApplePurchaseDiagnostic {
  category: ApplePurchaseErrorCategory;
  /** Native StoreKit/expo-iap code, when supplied. */
  code: string;
  /** Short provider message suitable for a local diagnostic journal. */
  message: string;
  productId?: string;
  storefront?: string;
  transactionState?: string;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Convert any expo-iap error into a bounded, non-sensitive diagnostic. */
export function normalizeApplePurchaseError(
  error: unknown,
  context: ApplePurchaseContext = {},
): ApplePurchaseDiagnostic {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = stringValue(record.code) ?? (typeof record.code === 'number' ? String(record.code) : undefined) ?? stringValue(record.responseCode) ?? 'UNKNOWN';
  const message = stringValue(record.debugMessage) ?? stringValue(record.message) ?? 'Apple purchase failed.';
  const productId = stringValue(record.productId) ?? (Array.isArray(record.productIds) ? stringValue(record.productIds[0]) : undefined) ?? stringValue(context.productId);
  const storefront = stringValue(record.storefrontCountryCodeIOS) ?? stringValue(context.storefront);
  const transactionState = stringValue(record.purchaseState) ?? stringValue(context.transactionState);
  const lower = `${code} ${message}`.toLowerCase();
  const category: ApplePurchaseErrorCategory = /cancel|user.?denied|user.?cancel|payment.?cancel/.test(lower)
    ? 'cancelled'
    : /timeout|timed.?out/.test(lower) ? 'timeout'
    : typeof record.status === 'number' && record.status > 0 ? 'verification'
    : /deferred|payment.?pending/.test(lower) ? 'pending'
    : /storefront/.test(lower) ? 'storefront'
    : /product.?unavailable|item.?unavailable|sku.?not.?found/.test(lower) ? 'product'
    : /network|offline|service.?unavailable|cannot.?connect|connection/.test(lower)
      ? 'network'
      : code !== 'UNKNOWN' ? 'storekit' : 'unknown';
  return {
    category,
    code: code.slice(0, 80),
    message: message.slice(0, 240),
    ...(productId ? { productId: productId.slice(0, 160) } : {}),
    ...(storefront ? { storefront: storefront.slice(0, 16) } : {}),
    ...(transactionState ? { transactionState: transactionState.slice(0, 40) } : {}),
  };
}

/** Stable customer copy; the native code remains available to diagnostics. */
export function applePurchaseUserMessage(diagnostic: ApplePurchaseDiagnostic, language: 'fr' | 'en' = 'fr'): string | null {
  if (diagnostic.category === 'cancelled') return null;
  if (diagnostic.code === 'CONFLICT') return language === 'en'
    ? 'This purchase conflicts with an existing DEVISERA subscription or billing account. Creating a new DEVISERA login does not reset Apple purchases. Restore from the original workspace or contact support. Do not purchase again.'
    : 'Cet achat entre en conflit avec un abonnement ou compte de facturation DEVISERA existant. Créer un nouveau compte DEVISERA ne réinitialise pas les achats Apple. Restaurez depuis l’espace du premier achat ou contactez le support. Ne payez pas à nouveau.';
  if (diagnostic.category === 'verification') return language === 'en'
    ? 'Your purchase could not be verified. Restore purchases to retry. Do not purchase again if Apple already confirmed payment.'
    : 'Votre achat n’a pas pu être vérifié. Restaurez vos achats pour réessayer. Ne payez pas à nouveau si Apple a déjà confirmé le paiement.';
  if (diagnostic.category === 'timeout') return language === 'en'
    ? 'Confirmation is taking longer than expected. Check your Apple subscriptions, then restore purchases.'
    : 'La confirmation prend plus de temps que prévu. Vérifiez vos abonnements Apple, puis restaurez vos achats.';
  if (diagnostic.category === 'pending') return language === 'en'
    ? 'This purchase is awaiting approval from Apple. You can return here once it is approved.'
    : 'Cet achat attend une autorisation Apple. Vous pourrez revenir ici après son approbation.';
  if (diagnostic.category === 'network') {
    return language === 'en'
      ? 'Apple could not reach the App Store. Check your connection and try again.'
      : 'Apple n’a pas pu joindre l’App Store. Vérifiez votre connexion puis réessayez.';
  }
  return language === 'en'
    ? 'Apple could not confirm this purchase. Check your App Store account and try again.'
    : 'Apple n’a pas pu confirmer cet achat. Vérifiez votre compte App Store puis réessayez.';
}
