import { requirePermission } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { createBillingPortalSession } from '@/server/services/billingService';

export async function POST() {
  return route(async () => {
    const auth = await requirePermission('billing:manage');
    const url = await createBillingPortalSession(auth.organization.organizationId);
    return ok({ url });
  });
}
