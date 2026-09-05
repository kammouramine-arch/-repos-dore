import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { syncAppleTransaction } from '@/server/services/appleBillingService';

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('billing:manage');
    const body = await parseBody(request, z.object({ signedTransaction: z.string().min(20).max(30_000) }));
    return ok(await syncAppleTransaction(body.signedTransaction, auth.organization.organizationId));
  });
}
