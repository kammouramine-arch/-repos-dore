import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { clientIpFrom, requirePermission } from '@/lib/auth/session';
import { changeMemberRole, removeMember } from '@/server/services/teamService';
import { assertCanWrite, assertPlanFeature } from '@/server/services/accessService';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const auth = await requirePermission('member:role');
    await assertCanWrite(auth.organization.organizationId);
    await assertPlanFeature(auth.organization.organizationId, 'team');
    const { id } = await params;
    const body = await parseBody(request, z.object({ role: z.enum(['ADMIN', 'MEMBER']) }).strict());
    const result = await changeMemberRole(auth, id, body.role, clientIpFrom(await headers()));
    return ok({ id: result.id, role: result.role });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const auth = await requirePermission('member:remove');
    await assertCanWrite(auth.organization.organizationId);
    await assertPlanFeature(auth.organization.organizationId, 'team');
    const { id } = await params;
    await removeMember(auth, id, clientIpFrom(await headers()));
    return ok({ removed: true });
  });
}
