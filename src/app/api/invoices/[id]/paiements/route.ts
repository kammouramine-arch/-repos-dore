import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { assertCanWrite } from '@/server/services/accessService';
import { recordPayment } from '@/server/services/invoiceService';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(['VIREMENT', 'CARTE', 'ESPECES', 'CHEQUE', 'AUTRE']),
  reference: z.string().max(140).optional(),
  receivedAt: z.string().datetime().optional(),
});

/** Saisie manuelle d'un encaissement reçu hors ligne. */
export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('payment:write');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    const input = await parseBody(request, schema);
    return ok(await recordPayment(auth.organization.organizationId, auth.user.id, id, input));
  });
}
