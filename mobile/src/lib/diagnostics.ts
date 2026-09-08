import type { DiagnosticCategory } from '@devisia/shared';

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
