import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, parseQuery, route } from '@/server/api';
import { customerSchema } from '@/server/validation';
import { createCustomer, listCustomers } from '@/server/services/customerService';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().max(120).optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('customer:read');
    const query = parseQuery(request, querySchema);
    const result = await listCustomers(auth.organization.organizationId, {
      search: query.q,
      take: query.take,
      skip: query.skip,
    });
    return ok(result);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('customer:write');
    const body = await parseBody(request, customerSchema);
    const customer = await createCustomer(auth.organization.organizationId, auth.user.id, body);
    return ok(customer, { status: 201 });
  });
}
