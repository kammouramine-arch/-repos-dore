import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, parseQuery, route } from '@/server/api';
import { priceBookSchema } from '@/server/validation';
import { createPriceBookItem, listPriceBook } from '@/server/services/priceBookService';

const querySchema = z.object({
  q: z.string().max(120).optional(),
  categorie: z.enum(['MATERIAU', 'SERVICE', 'MAIN_OEUVRE', 'PACK']).optional(),
  inactifs: z.coerce.boolean().optional(),
});

export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('pricebook:read');
    const query = parseQuery(request, querySchema);
    const items = await listPriceBook(auth.organization.organizationId, {
      search: query.q,
      category: query.categorie,
      includeInactive: query.inactifs,
    });
    return ok(items);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('pricebook:write');
    const body = await parseBody(request, priceBookSchema);
    const item = await createPriceBookItem(auth.organization.organizationId, auth.user.id, body);
    return ok(item, { status: 201 });
  });
}
