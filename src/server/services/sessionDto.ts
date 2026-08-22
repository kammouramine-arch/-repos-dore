import 'server-only';
import { prisma } from '@/lib/prisma';
import { aiCapabilities } from '@/lib/ai';
import type { AuthContext } from '@/lib/auth/session';
import type { SessionDTO, SubscriptionDTO } from '@devisia/shared';

/** Contexte de session tel que le consomment le web et le mobile. */
export async function buildSessionDTO(auth: AuthContext): Promise<SessionDTO> {
  return buildSessionDTOFor(auth.user.id, auth.organization.organizationId);
}

/**
 * Contexte de session reconstruit depuis la base.
 *
 * Nécessaire juste après une connexion mobile : le jeton vient d'être émis et
 * n'accompagne donc pas encore la requête en cours.
 */
export async function buildSessionDTOFor(
  userId: string,
  organizationId: string,
): Promise<SessionDTO> {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { user: true, organization: true },
  });
  if (!membership) throw new Error('Adhésion introuvable pour cette session.');

  const auth = {
    user: {
      id: membership.user.id,
      email: membership.user.email,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      emailVerified: membership.user.emailVerifiedAt != null,
    },
    organization: {
      id: organizationId,
      name: membership.organization.name,
      role: membership.role,
    },
  };

  const [subscription, profile] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId } }),
    prisma.businessProfile.findUnique({
      where: { organizationId },
      select: { trade: true, onboardingCompleted: true },
    }),
  ]);

  return {
    user: auth.user,
    organization: {
      ...auth.organization,
      trade: profile?.trade ?? null,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
    },
    subscription: subscription ? toSubscriptionDTO(subscription) : null,
    capabilities: aiCapabilities(),
  };
}

export function toSubscriptionDTO(subscription: {
  plan: SubscriptionDTO['plan'];
  status: SubscriptionDTO['status'];
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}): SubscriptionDTO {
  return {
    plan: subscription.plan,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}
