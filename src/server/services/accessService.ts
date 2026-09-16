import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { accessStateFor, featureBlock, type AccessState, type SubscriptionSnapshot } from '@devisia/shared';
import { PLANS } from '@/lib/billing/plans';
import type { PlanFeatures } from '@devisia/shared';

/** Nom d'une capacité de formule, tel que déclaré dans le paquet partagé. */
export type PlanFeatureName = keyof PlanFeatures;

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

/**
 * Refuse côté serveur une fonctionnalité que la formule ne couvre pas.
 *
 * La visibilité dans l'interface n'est qu'un confort : toute mutation qui
 * ouvre une capacité payante passe aussi par ici. La phrase de refus vient de
 * `@devisia/shared`, donc le client affiche exactement la règle appliquée.
 */
export async function assertPlanFeature(
  organizationId: string,
  feature: PlanFeatureName,
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });
  const verdict = featureBlock(subscription?.plan ?? 'ESSENTIEL', feature);
  if (verdict.blocked) {
    throw new AppError('PLAN_LIMIT', verdict.reason ?? 'Cette fonctionnalité n’est pas incluse dans votre formule.');
  }
}

