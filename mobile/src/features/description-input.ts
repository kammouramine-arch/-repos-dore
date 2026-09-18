/**
 * Contrat du champ de description du chantier.
 *
 * Deux valeurs distinctes : ce que le champ AFFICHE pendant la frappe (le
 * texte tel quel, espaces compris) et ce que l'application ENVOIE (normalisé
 * une seule fois, à la soumission). Confondre les deux a produit un clavier
 * dont la barre d'espace ne faisait rien : chaque espace final était retiré
 * par le rendu contrôlé avant la frappe suivante.
 */
export function displayedDescription(typed: string, partial: string, listening: boolean): string {
  if (!listening) return typed;
  return partial ? `${typed}${typed && !/\s$/.test(typed) ? ' ' : ''}${partial}` : typed;
}

export function submittedDescription(typed: string, partial = ''): string {
  return `${typed}${partial ? ` ${partial}` : ''}`.trim();
}

/** Ajout d'un résultat de dictée à la suite du texte existant. */
export function appendDictation(typed: string, text: string): string {
  const base = typed.replace(/\s+$/, '');
  return base ? `${base} ${text}` : text;
}
