import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, route } from '@/server/api';
import { assertCanWrite } from '@/server/services/accessService';
import { markInvoiceSent } from '@/server/services/invoiceService';

type Params = { params: Promise<{ id: string }> };

/** Émet la facture : elle devient consultable et payable par le client. */
export async function POST(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('invoice:send');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    return ok(await markInvoiceSent(auth.organization.organizationId, auth.user.id, id));
  });
}
