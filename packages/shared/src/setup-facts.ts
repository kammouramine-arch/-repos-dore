/**
 * Faits de mise en place, partagés par le web et l'application iOS.
 *
 * L'entreprise est renseignée quand ses coordonnées légales existent ET
 * qu'on peut la joindre (adresse complète ou téléphone). Aucun drapeau à
 * part : une tâche reste cochée tant que le fait reste vrai.
 */
export interface BusinessSetupFacts {
  siret?: string | null;
  vatNumber?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  phone?: string | null;
}

export function businessComplete(profile: BusinessSetupFacts | null | undefined): boolean {
  if (!profile) return false;
  const identity = Boolean(profile.siret?.trim() || profile.vatNumber?.trim());
  const contact = Boolean(profile.addressLine1?.trim() && profile.city?.trim()) || Boolean(profile.phone?.trim());
  return identity && contact;
}

export interface SetupStatus {
  business: boolean;
  catalogue: boolean;
  clients: boolean;
}

export function setupProgress(status: SetupStatus): { done: number; total: number; complete: boolean } {
  const done = [status.business, status.catalogue, status.clients].filter(Boolean).length;
  return { done, total: 3, complete: done === 3 };
}
