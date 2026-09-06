import 'server-only';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';

/** Allowlisted personal account data: never export authentication material. */
export async function exportPersonalAccount(userId: string) {
  const account = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      locale: true, emailVerifiedAt: true, createdAt: true, updatedAt: true,
      memberships: { where: { deletedAt: null }, select: { role: true, createdAt: true, organization: { select: { id: true, name: true, country: true, currency: true, timezone: true } } } },
    },
  });
  if (!account) throw notFound('Compte introuvable.');
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    scope: 'personal-account',
    account,
    exclusions: ['Documents et données commerciales de l’entreprise', 'Journaux de sécurité soumis à examen', 'Données conservées par les prestataires externes'],
    furtherRequests: 'contact@amyn.agency',
  };
}
