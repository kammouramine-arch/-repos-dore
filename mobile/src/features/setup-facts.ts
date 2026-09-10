/**
 * Faits de mise en place, sans dépendance : testables partout.
 * L'entreprise est renseignée quand ses coordonnées légales existent ET
 * qu'on peut la joindre (adresse complète ou téléphone).
 */
export function businessComplete(profile: { siret?: string | null; vatNumber?: string | null; addressLine1?: string | null; city?: string | null; phone?: string | null } | null | undefined): boolean {
  if (!profile) return false;
  const identity = Boolean(profile.siret?.trim() || profile.vatNumber?.trim());
  const contact = Boolean(profile.addressLine1?.trim() && profile.city?.trim()) || Boolean(profile.phone?.trim());
  return identity && contact;
}
