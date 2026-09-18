import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, route } from '@/server/api';
import { convertLeadToCustomer } from '@/server/services/leadService';
import { assertCanWrite } from '@/server/services/accessService';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('lead:write');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    const result = await convertLeadToCustomer(
      auth.organization.organizationId,
      auth.user.id,
      id,
    );
    return ok(result);
  });
}
