import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, parseQuery, route } from '@/server/api';
import { assertCanWrite } from '@/server/services/accessService';
import { createInvoiceFromQuote, listInvoices } from '@/server/services/invoiceService';

const querySchema = z.object({
  statut: z.enum(['BROUILLON', 'ENVOYEE', 'PARTIELLE', 'PAYEE', 'EN_RETARD', 'ANNULEE']).optional(),
  clientId: z.string().uuid().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  quoteId: z.string().uuid(),
  dueInDays: z.number().int().min(0).max(365).optional(),
  deductDeposit: z.boolean().optional(),
});

export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('invoice:read');
    const query = parseQuery(request, querySchema);
    return ok(
      await listInvoices(auth.organization.organizationId, {
        status: query.statut,
        customerId: query.clientId,
        limit: query.take,
      }),
    );
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('invoice:write');
    await assertCanWrite(auth.organization.organizationId);
    const input = await parseBody(request, createSchema);
    return ok(await createInvoiceFromQuote(auth.organization.organizationId, auth.user.id, input), { status: 201 });
  });
}
