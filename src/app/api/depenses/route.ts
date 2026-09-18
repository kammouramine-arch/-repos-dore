import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, parseQuery, route } from '@/server/api';
import { assertCanWrite, assertPlanFeature } from '@/server/services/accessService';
import { createExpense, listExpenses } from '@/server/services/expenseService';

const CATEGORIES = [
  'MATERIAUX', 'OUTILLAGE', 'CARBURANT', 'VEHICULE', 'SOUS_TRAITANCE', 'ASSURANCE',
  'TELECOM', 'LOYER', 'FOURNITURES', 'REPAS', 'FORMATION', 'TAXES', 'AUTRE',
] as const;

const querySchema = z.object({
  du: z.string().datetime().optional(),
  au: z.string().datetime().optional(),
  poste: z.enum(CATEGORIES).optional(),
  take: z.coerce.number().int().min(1).max(500).default(200),
});

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
  parsed: z.record(z.string(), z.unknown()).nullish(),
});

export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('expense:read');
    await assertPlanFeature(auth.organization.organizationId, 'receiptScanning');
    const query = parseQuery(request, querySchema);
    return ok(
      await listExpenses(auth.organization.organizationId, {
        from: query.du,
        to: query.au,
        category: query.poste,
        limit: query.take,
      }),
    );
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('expense:write');
    await assertCanWrite(auth.organization.organizationId);
    await assertPlanFeature(auth.organization.organizationId, 'receiptScanning');
    const input = await parseBody(request, expenseSchema);
    return ok(
      await createExpense(auth.organization.organizationId, auth.user.id, input as never),
      { status: 201 },
    );
  });
}
