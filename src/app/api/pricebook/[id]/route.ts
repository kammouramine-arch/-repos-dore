import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { priceBookSchema } from '@/server/validation';
import { deletePriceBookItem, updatePriceBookItem } from '@/server/services/priceBookService';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('pricebook:write');
    const id = idSchema.parse((await params).id);
    const body = await parseBody(request, priceBookSchema.partial());
    const item = await updatePriceBookItem(auth.organization.organizationId, auth.user.id, id, body);
    return ok(item);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('pricebook:write');
    const id = idSchema.parse((await params).id);
    await deletePriceBookItem(auth.organization.organizationId, auth.user.id, id);
    return ok({ deleted: true });
  });
}
