import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { changePlan } from '@/server/services/billingService';

const bodySchema = z.object({ plan: z.enum(['ESSENTIEL', 'PRO', 'ENTREPRISE']) });

/** Changement de formule : montée immédiate, descente à l'échéance. */
export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('billing:manage');
    const body = await parseBody(request, bodySchema);
    const result = await changePlan(auth.organization.organizationId, body.plan);
    return ok(result);
  });
}
