import type { DiagnosticCategory } from '@devisia/shared';
declare const __DEV__: boolean;

/**
 * Journal technique embarqué.
 *
 * Une panne signalée depuis un iPhone n'a longtemps porté qu'un libellé
 * (« problème temporaire ») : impossible de dire s'il s'agissait du réseau,
 * d'un refus de session, ou d'un 500 côté serveur, ni de retrouver la ligne
 * de journal correspondante. Chaque évènement porte désormais le chemin
 * anonymisé, le statut HTTP, la famille de panne et la référence serveur.
 * Jamais de jeton, d'adresse email, de contenu de devis ni de paramètre.
 */
export type Diagnostic = {
  area: string;
  durationMs: number;
  code: string;
  at: string;
  category?: DiagnosticCategory | 'startup';
  path?: string;
  status?: number;
  requestId?: string;
  productId?: string;
  storefront?: string;
  transactionState?: string;
  transactionReference?: string;
  requestedProductIds?: string[];
  returnedProductIds?: string[];
  /** Missing from Apple's result, not proof Apple declared an ID invalid. */
  missingProductIds?: string[];
  productCount?: number;
  nativeCode?: string;
  currency?: string;
  displayPrice?: string;
  subscriptionPeriodUnit?: string | null;
  subscriptionPeriodCount?: string | number | null;
  introPaymentMode?: string | null;
  introPeriod?: string | null;
  introPeriodCount?: string | number | null;
  introPrice?: string | number | null;
  introEligible?: boolean;
  cachePolicy?: string;
  /* Changement de formule : produit actif et produit demandé. */
  currentProductId?: string | null;
  targetProductId?: string | null;
  priceSource?: string;
  /* Lecture StoreKit 2 directe, comparée à la bibliothèque d'achat. */
  storefrontId?: string;
  nativeDisplayPrice?: string | null;
  nativeCurrency?: string | null;
  nativePriceLocale?: string | null;
  catalogCurrency?: string | null;
  catalogPriceFormatted?: string | null;
  catalogPath?: string | null;
  catalogIntroOffer?: boolean | null;
  nativeIntroOffer?: boolean | null;
  expectedCurrency?: string | null;
};

const events: Diagnostic[] = [];
const LIMIT = 120;

export function recordDiagnostic(event: Omit<Diagnostic, 'at'>) {
  const entry: Diagnostic = { ...event, at: new Date().toISOString() };
  events.push(entry);
  if (events.length > LIMIT) events.shift();
  if (__DEV__ && event.category && event.category !== 'ok') {
    console.info(`[devisera] ${event.category} ${event.path ?? event.area} ${event.status ?? ''} ${event.code}${event.requestId ? ` ref=${event.requestId}` : ''}`);
  }
}

export function readDiagnostics() {
  return events.map((event) => ({ ...event }));
}

/** Dernière panne serveur observée : sa référence oriente le support. */
export function lastServerFailure(): Diagnostic | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]!.category === 'server') return { ...events[index]! };
  }
  return null;
}
