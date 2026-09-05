import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { accessStateFor, type AccessState, type SubscriptionSnapshot } from '@devisia/shared';

/**
 * Droits d'accès d'une organisation, calculés à partir de son abonnement.
 *
 * La règle vit dans le paquet partagé : le serveur l'applique, les clients
 * l'affichent. Aucun client ne peut s'accorder un droit.
 */
export async function getAccessState(organizationId: string): Promise<AccessState> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: {
      plan: true,
      appleProductId: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  const snapshot: SubscriptionSnapshot | null = subscription
    ? {
        plan: subscription.plan,
        provider: subscription.appleProductId ? 'apple' : undefined,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }
    : null;

  return accessStateFor(snapshot);
}

/**
 * Exige un abonnement permettant d'écrire (créer un devis, envoyer, relancer).
 * La lecture et l'export restent toujours possibles : on ne prend jamais en
 * otage les données de l'utilisateur.
 */
export async function assertCanWrite(organizationId: string): Promise<AccessState> {
  const state = await getAccessState(organizationId);
  if (!state.canWrite) {
    throw new AppError(
      'PLAN_LIMIT',
      state.reason ?? 'Votre abonnement ne permet plus cette action.',
    );
  }
  return state;
}
