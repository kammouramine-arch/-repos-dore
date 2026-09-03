import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { customerSchema } from '@/server/validation';
import {
  deleteCustomer,
  getCustomer,
  updateCustomer,
} from '@/server/services/customerService';
import { toCustomerDTO } from '@/server/dto';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('customer:read');
    const id = idSchema.parse((await params).id);
    const result = await getCustomer(auth.organization.organizationId, id);
    return ok({ customer: toCustomerDTO(result.customer), stats: result.stats });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('customer:write');
    const id = idSchema.parse((await params).id);
    const body = await parseBody(request, customerSchema.partial());
    const customer = await updateCustomer(auth.organization.organizationId, auth.user.id, id, body);
    return ok(customer);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('customer:delete');
    const id = idSchema.parse((await params).id);
    await deleteCustomer(auth.organization.organizationId, auth.user.id, id);
    return ok({ deleted: true });
  });
}
