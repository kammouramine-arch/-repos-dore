import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { clientIpFrom, requirePermission } from '@/lib/auth/session';
import { cancelInvitation, resendInvitation } from '@/server/services/teamService';
import { assertCanWrite, assertPlanFeature } from '@/server/services/accessService';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const auth = await requirePermission('member:invite');
    await assertCanWrite(auth.organization.organizationId);
    await assertPlanFeature(auth.organization.organizationId, 'team');
    const { id } = await params;
    const body = await parseBody(request, z.object({ action: z.enum(['resend', 'cancel']) }).strict());
    const result = body.action === 'resend'
      ? await resendInvitation(auth, id, clientIpFrom(await headers()))
      : await cancelInvitation(auth, id, clientIpFrom(await headers()));
    return ok({ id: result.id, status: result.status, expiresAt: result.expiresAt.toISOString() });
  });
}
