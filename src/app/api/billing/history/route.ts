import { requirePermission } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { getBillingHistory } from '@/server/services/billingHistoryService';

/** Provider-owned payment history; Apple receipts are links, not fabricated rows. */
export async function GET() {
  return route(async () => {
    const auth = await requirePermission('billing:view');
    return ok(await getBillingHistory(auth.organization.organizationId, auth.user.locale));
  });
}
