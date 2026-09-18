/**
 * La durée d'une traversée de la lentille, plafonnée.
 *
 * ## Pourquoi une durée, et non un ressort
 *
 * La version précédente utilisait un ressort réglé sur une mesure de la
 * référence Instagram — 0,52 à 0,87 s. La mesure était juste et mal
 * interprétée : les longues transitions relevées étaient des **balayages**,
 * pas des touchers d'onglet. Sur l'appareil, la capsule mettait 0,64 s à
 * traverser, et cela se lit comme un objet visqueux qu'on attend.
 *
 * Un toucher d'onglet ne doit pas se regarder : il doit avoir déjà eu lieu.
 *
 * ## Pourquoi un plafond
 *
 * Un ressort donne une durée proportionnelle à la distance : Accueil → Compte
 * traînait deux fois plus qu'un onglet voisin, alors que l'utilisateur attend
 * la même chose des deux gestes. Ici, franchir quatre onglets ne coûte que
 * 65 ms de plus qu'en franchir un.
 *
 * Ce fichier n'importe rien : la règle se vérifie sans simulateur.
 */
export function travelDuration(tabsJumped: number): number {
  return Math.min(220, 155 + Math.max(1, tabsJumped) * 16);
}
