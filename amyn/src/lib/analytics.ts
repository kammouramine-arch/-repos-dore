/**
 * Événements de conversion — une couche neutre, sans outil tiers.
 *
 * Le site n'embarque aujourd'hui AUCUN outil de mesure (ni cookie, ni
 * traceur : voir trackers.ts et la page Cookies). Cette couche se contente
 * d'émettre des événements nommés, que n'importe quel outil branché plus
 * tard pourra écouter, sans modifier les composants :
 *
 *   - un `CustomEvent("amyn:track", { detail: { event, ...props } })` sur
 *     `window` ;
 *   - un `push` dans `window.dataLayer` SI un outil l'a créé (on ne le crée
 *     pas soi-même).
 *
 * Aucune donnée personnelle n'est transmise : seulement des noms
 * d'événements et des propriétés techniques (emplacement, étape, langue).
 * Tout outil ajouté devra être déclaré dans trackers.ts et, s'il n'est pas
 * exempté, n'être chargé qu'après consentement.
 */

export const TRACK_EVENTS = [
  "revenue_os_cta_clicked",
  "revenue_audit_cta_clicked",
  "revenue_audit_started",
  "revenue_audit_step_completed",
  "revenue_audit_submitted",
  "revenue_os_viewed",
  "roi_calculator_completed",
  "contact_initiated",
  "demo_started",
  "demo_completed",
  "demo_stage_viewed",
  "revenue_audit_clicked_from_demo",
  "contact_clicked_from_demo",
  "audit_opened",
  "audit_section_viewed",
  "roi_interacted",
  "architecture_session_clicked",
  "audit_pdf_exported",
] as const;

export type TrackEvent = (typeof TRACK_EVENTS)[number];
export type TrackProps = Record<string, string | number | boolean | undefined>;

export const TRACK_DOM_EVENT = "amyn:track";

/**
 * Brancher un outil de mesure — UN seul endroit.
 *
 * Aucun outil n'est installé. Pour en ajouter un (après choix et, si
 * nécessaire, consentement — voir trackers.ts et la page Cookies), appeler
 * une fois, côté navigateur :
 *
 *   registerAnalyticsSink((event, props) => monOutil.capture(event, props));
 *
 * Tous les événements du site passent par `track()` ci-dessous, donc par
 * ce point d'entrée. Une erreur de l'outil ne remonte jamais jusqu'au site.
 */
export type AnalyticsSink = (event: TrackEvent, props: TrackProps) => void;
let sink: AnalyticsSink | null = null;

export function registerAnalyticsSink(next: AnalyticsSink | null) {
  sink = next;
}

/** Émet un événement. Sans outil branché : ne fait rien de visible. */
export function track(event: TrackEvent, props: TrackProps = {}) {
  if (typeof window === "undefined") return;
  const detail = { event, ...props };
  try {
    window.dispatchEvent(new CustomEvent(TRACK_DOM_EVENT, { detail }));
    const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    if (Array.isArray(layer)) layer.push(detail);
    sink?.(event, props);
  } catch {
    /* La mesure ne doit jamais gêner la navigation. */
  }
}

export const isTrackEvent = (value: string | undefined): value is TrackEvent =>
  !!value && (TRACK_EVENTS as readonly string[]).includes(value);
