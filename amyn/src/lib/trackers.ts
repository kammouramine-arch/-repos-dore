/**
 * Inventaire des cookies et traceurs du site.
 *
 * Constaté au 28 septembre 2026 par un audit du site rendu (requêtes
 * réseau, cookies et stockage du navigateur) : le site ne dépose aucun
 * cookie, n'utilise ni localStorage ni sessionStorage, et ne charge aucune
 * ressource tierce. Les polices sont servies par le site lui-même.
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
