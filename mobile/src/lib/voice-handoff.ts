/**
 * Passage de la dictée entre l'accueil et l'écran de création.
 *
 * L'artisan parle depuis l'accueil ; la transcription doit arriver intacte
 * dans l'écran de devis. La faire transiter par l'URL la tronquerait et la
 * ferait apparaître dans les journaux de navigation — une description de
 * chantier contient le nom et l'adresse d'un client.
 *
 * Ce dépôt vit en mémoire, le temps d'une navigation. Il se vide à la lecture :
 * revenir plus tard sur l'écran de création ne doit pas ressusciter une
 * dictée abandonnée.
 */

let pending: string | null = null;

/** Dépose la transcription avant de naviguer vers l'écran de création. */
export function stashDictation(text: string): void {
  const trimmed = text.trim();
  pending = trimmed.length > 0 ? trimmed : null;
}

/** Récupère la transcription déposée, une seule fois. */
export function takeDictation(): string | null {
  const value = pending;
  pending = null;
  return value;
}

/** Oublie une dictée en attente (annulation, déconnexion). */
export function clearDictation(): void {
  pending = null;
}
