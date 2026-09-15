import { requirePermission } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { resumeSubscription } from '@/server/services/billingService';

/** Annule une résiliation programmée. */
export async function POST() {
  return route(async () => {
    const auth = await requirePermission('billing:manage');
    return ok(await resumeSubscription(auth.organization.organizationId));
  });
}
