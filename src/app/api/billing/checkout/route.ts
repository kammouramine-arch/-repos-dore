import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { AppError } from '@/lib/errors';
import { createCheckoutSession } from '@/server/services/billingService';

const bodySchema = z.object({ plan: z.enum(['ESSENTIEL', 'PRO', 'ENTREPRISE']) });

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('billing:manage');
    const body = await parseBody(request, bodySchema);
    const url = await createCheckoutSession({
      organizationId: auth.organization.organizationId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      plan: body.plan,
    });
    if (!url) throw new AppError('PROVIDER_UNAVAILABLE', "La session de paiement n'a pas pu être créée.");
    return ok({ url });
  });
}
