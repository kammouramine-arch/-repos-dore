import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { assertCanWrite, assertPlanFeature } from '@/server/services/accessService';
import { deleteExpense, updateExpense } from '@/server/services/expenseService';

type Params = { params: Promise<{ id: string }> };

const CATEGORIES = [
  'MATERIAUX', 'OUTILLAGE', 'CARBURANT', 'VEHICULE', 'SOUS_TRAITANCE', 'ASSURANCE',
  'TELECOM', 'LOYER', 'FOURNITURES', 'REPAS', 'FORMATION', 'TAXES', 'AUTRE',
] as const;

const expenseSchema = z.object({
  merchant: z.string().trim().min(2).max(140),
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(600).optional(),
  spentAt: z.string().datetime(),
  amountCents: z.number().int().positive(),
  vatCents: z.number().int().min(0).optional(),
  reference: z.string().trim().max(64).optional(),
  paymentMethod: z.enum(['VIREMENT', 'CARTE', 'ESPECES', 'CHEQUE', 'AUTRE']).optional(),
  receiptFileId: z.string().uuid().nullish(),
});

export async function PUT(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('expense:write');
    await assertCanWrite(auth.organization.organizationId);
    await assertPlanFeature(auth.organization.organizationId, 'receiptScanning');
    const id = idSchema.parse((await params).id);
    const input = await parseBody(request, expenseSchema);
    return ok(await updateExpense(auth.organization.organizationId, auth.user.id, id, input as never));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('expense:delete');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    await deleteExpense(auth.organization.organizationId, auth.user.id, id);
    return ok({ deleted: true });
  });
}
