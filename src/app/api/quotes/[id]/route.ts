import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { quoteSchema } from '@/server/validation';
import { deleteQuote, getQuote, updateQuote } from '@/server/services/quoteService';
import { assertCanWrite } from '@/server/services/accessService';
import { toQuoteDTO } from '@/server/dto';
import { appUrl } from '@/lib/env';
import { fullName } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('quote:read');
    const id = idSchema.parse((await params).id);
    const quote = await getQuote(auth.organization.organizationId, id);
    return ok({
      ...toQuoteDTO(quote),
      customerName: fullName(
        quote.customer.firstName,
        quote.customer.lastName,
        quote.customer.companyName,
      ),
      publicUrl: appUrl(`/devis/${quote.publicToken}`),
    });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('quote:write');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    const body = await parseBody(request, quoteSchema);
    const quote = await updateQuote(auth.organization.organizationId, auth.user.id, id, {
      ...body,
      items: body.items.map((item) => ({ ...item, description: item.description ?? null })),
    });
    return ok(toQuoteDTO(quote));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('quote:delete');
    const id = idSchema.parse((await params).id);
    await deleteQuote(auth.organization.organizationId, auth.user.id, id);
    return ok({ deleted: true });
  });
}
