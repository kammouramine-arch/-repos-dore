import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseQuery, route } from '@/server/api';
import { assertPlanFeature } from '@/server/services/accessService';
import {
  createOnboardingLink,
  paymentAccountState,
  refreshPaymentAccount,
} from '@/server/services/paymentAccountService';

const querySchema = z.object({ refresh: z.coerce.boolean().optional() });

/**
 * État de l'encaissement en ligne (Stripe Connect) de l'entreprise.
 *
 * `?refresh=1` relit l'état chez Stripe — utilisé au retour de l'inscription,
 * quand le webhook `account.updated` n'est pas encore arrivé.
 */
export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('billing:view');
    const query = parseQuery(request, querySchema);
    const organizationId = auth.organization.organizationId;
    return ok(query.refresh ? await refreshPaymentAccount(organizationId) : await paymentAccountState(organizationId));
  });
}

/**
 * Ouvre l'inscription Stripe de l'artisan et renvoie son lien.
 *
 * Réservé au propriétaire : c'est son identité et son compte bancaire qui sont
 * transmis à Stripe. Le lien est à usage unique, donc régénéré à chaque appel.
 */
export async function POST() {
  return route(async () => {
    const auth = await requirePermission('billing:manage');
    await assertPlanFeature(auth.organization.organizationId, 'clientPayments');
    return ok(await createOnboardingLink(auth.organization.organizationId, auth.user.id));
  });
}
