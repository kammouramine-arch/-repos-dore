import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { usageSummary } from '@/server/services/usageService';
import { toSubscriptionDTO } from '@/server/services/sessionDto';
import { isBillingConfigured } from '@/lib/billing/stripe';
import { notFound } from '@/lib/errors';
import type { BillingOverviewDTO } from '@devisia/shared';

/** État d'abonnement et consommation, partagés par le web et le mobile. */
export async function GET() {
  return route(async () => {
    const auth = await requirePermission('billing:view');
    const organizationId = auth.organization.organizationId;

    const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
    if (!subscription) throw notFound('Abonnement introuvable.');

    const payload: BillingOverviewDTO = {
      subscription: toSubscriptionDTO(subscription),
      usage: await usageSummary(organizationId, subscription.plan),
      billingReady: isBillingConfigured(),
      canManage: auth.organization.role === 'OWNER',
    };
    return ok(payload);
  });
}
