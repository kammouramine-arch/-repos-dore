import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { cancelSubscription } from '@/server/services/billingService';

const bodySchema = z.object({ immediate: z.boolean().default(false) });

/** Résiliation, par défaut à la fin de la période déjà payée. */
export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('billing:manage');
    const body = await parseBody(request, bodySchema);
    const result = await cancelSubscription(auth.organization.organizationId, body.immediate);
    return ok(result);
  });
}
