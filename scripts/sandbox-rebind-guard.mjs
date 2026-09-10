/**
 * Conditions d'une réconciliation Sandbox.
 *
 * Volontairement distinct de `sandbox-reset-guard.mjs` : celui-ci autorise
 * l'archivage d'un lien Apple, il ne supprime ni espace, ni client, ni devis.
 * Il n'exige donc pas l'absence de données commerciales — cette exigence-là
 * protège une suppression, pas un changement de rattachement. Chaque autre
 * verrou reste en place, et l'environnement Sandbox attesté par Apple est
 * la condition qui rend l'opération impossible en Production.
 */
export function assertSandboxRebind({
  environment,
  originalTransactionId,
  sourceOrganizationId,
  targetOrganizationId,
  targetHasAppleBinding,
  targetStripeSubscriptionId,
  targetStatus,
  approval,
  provenance,
}) {
  if (environment !== 'Sandbox') {
    throw new Error(`Refusé : seule une transaction attestée Sandbox peut être réconciliée (reçu : ${environment ?? 'aucun'})`);
  }
  if (!originalTransactionId) {
    throw new Error('Refusé : l’espace source ne porte aucun lien Apple');
  }
  if (!sourceOrganizationId || !targetOrganizationId) {
    throw new Error('Refusé : les deux espaces doivent être désignés explicitement');
  }
  if (sourceOrganizationId === targetOrganizationId) {
    throw new Error('Refusé : espace source et cible identiques');
  }
  if (targetHasAppleBinding) {
    throw new Error('Refusé : l’espace cible possède déjà un abonnement Apple');
  }
  if (targetStripeSubscriptionId && ['active', 'past_due'].includes(targetStatus)) {
    throw new Error('Refusé : l’espace cible possède un abonnement web vivant');
  }
  if (!approval || approval.length < 16) {
    throw new Error('Refusé : référence d’approbation explicite du propriétaire requise (16 caractères minimum)');
  }
  if (!provenance || provenance.length < 16) {
    throw new Error('Refusé : provenance consignée requise (16 caractères minimum)');
  }
}
