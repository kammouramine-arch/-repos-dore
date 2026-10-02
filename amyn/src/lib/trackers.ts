/**
 * Inventaire des cookies et traceurs du site.
 *
 * Constaté le 2 octobre 2026 sur www.amyn.agency (en-têtes HTTP de chaque
 * type de page et de l'API, requêtes réseau, cookies et stockage du
 * navigateur, ordinateur et mobile) : aucun cookie, ni localStorage ni
 * sessionStorage, aucune ressource tierce, aucun script d'analyse (Vercel
 * Analytics / Speed Insights, Google Analytics, Meta Pixel…). La langue
 * fait partie de l'adresse (/en) : rien n'est enregistré. Les polices sont
 * servies par le site lui-même.
 *
 * RÈGLE : tout ajout d'outil de mesure d'audience, de publicité, de réseau
 * social ou de contenu embarqué doit :
 *   1. être déclaré ici ;
 *   2. s'il n'est pas strictement nécessaire, ne se charger qu'APRÈS
 *      consentement, avec « Tout accepter », « Tout refuser » et
 *      « Personnaliser » aussi accessibles l'un que l'autre, et un lien
 *      « Gérer mes cookies » permanent pour retirer son choix.
 * Tant que la liste des traceurs soumis à consentement est vide, afficher
 * un bandeau serait trompeur : il n'y en a donc pas.
 */

export type Tracker = {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  requiresConsent: boolean;
};

export const trackers: Tracker[] = [];

export const consentRequired = trackers.some((t) => t.requiresConsent);
