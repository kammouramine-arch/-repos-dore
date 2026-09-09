import 'server-only';
import { prisma } from '@/lib/prisma';
import { aiCapabilities } from '@/lib/ai';
import type { AuthContext } from '@/lib/auth/session';
import { accessStateFor, authNextStepFor, planForAppleProduct, type SessionDTO, type SubscriptionDTO } from '@devisia/shared';

/** Contexte de session tel que le consomment le web et le mobile. */
export async function buildSessionDTO(auth: AuthContext): Promise<SessionDTO> {
  // requireAuth already read and validated the user and membership for this
  // request. Reuse them instead of adding another database round trip at launch.
  const organizationId = auth.organization.organizationId;
  const [subscription, profile] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId } }),
    prisma.businessProfile.findUnique({
      where: { organizationId },
      select: { trade: true, onboardingCompleted: true },
    }),
  ]);
  const subscriptionDto = subscription ? toSubscriptionDTO(subscription) : null;
  const access = accessStateFor(subscriptionDto);
  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
      firstName: auth.user.firstName,
      lastName: auth.user.lastName,
      emailVerified: auth.user.emailVerified,
      locale: auth.user.locale,
    },
    organization: {
      id: organizationId,
      name: auth.organization.organizationName,
      role: auth.organization.role,
      trade: profile?.trade ?? null,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
    },
    subscription: subscriptionDto,
    access,
    nextStep: authNextStepFor({ emailVerified: auth.user.emailVerified, canWrite: access.canWrite }),
    capabilities: aiCapabilities(),
  };
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
      locale: membership.user.locale,
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

  const subscriptionDto = subscription ? toSubscriptionDTO(subscription) : null;
  const access = accessStateFor(subscriptionDto);
  return {
    user: auth.user,
    organization: {
      ...auth.organization,
      trade: profile?.trade ?? null,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
    },
    subscription: subscriptionDto,
    access,
    nextStep: authNextStepFor({ emailVerified: auth.user.emailVerified, canWrite: access.canWrite }),
    capabilities: aiCapabilities(),
  };
}

export function toSubscriptionDTO(subscription: {
  plan: SubscriptionDTO['plan'];
  status: SubscriptionDTO['status'];
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  appleProductId?: string | null;
  appleEnvironment?: string | null;
  applePendingProductId?: string | null;
  applePendingAt?: Date | null;
  stripeSubscriptionId?: string | null;
}): SubscriptionDTO {
  const pendingPlan = subscription.appleProductId && subscription.applePendingProductId
    ? planForAppleProduct(subscription.applePendingProductId) ?? null : null;
  return {
    provider: subscription.appleProductId ? 'apple' : subscription.stripeSubscriptionId ? 'stripe' : 'trial',
    appleEnvironment: subscription.appleProductId ? subscription.appleEnvironment ?? null : null,
    plan: subscription.plan,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    pendingPlan,
    pendingAt: pendingPlan ? subscription.applePendingAt?.toISOString() ?? subscription.currentPeriodEnd?.toISOString() ?? null : null,
  };
}
