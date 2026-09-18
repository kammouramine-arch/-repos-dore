import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, route } from '@/server/api';
import { assertCanWrite } from '@/server/services/accessService';
import { cancelInvoice, invoiceDetail } from '@/server/services/invoiceService';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('invoice:read');
    const id = idSchema.parse((await params).id);
    return ok(await invoiceDetail(auth.organization.organizationId, id));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('invoice:write');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    return ok(await cancelInvoice(auth.organization.organizationId, auth.user.id, id));
  });
}
