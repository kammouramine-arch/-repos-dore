import { ok, route } from '@/server/api';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { startInvoicePayment } from '@/server/services/paymentAccountService';

type Params = { params: Promise<{ token: string }> };

/**
 * Ouvre la page de paiement Stripe d'une facture.
 *
 * Le montant n'est jamais transmis par le navigateur : il est recalculé à
 * partir de la facture. La confirmation du règlement viendra du webhook signé,
 * pas de la redirection de succès.
 */
export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const token = (await params).token;
    await enforceRateLimit({ key: `pay:${token}`, ...RATE_LIMITS.publicQuoteAction });
    return ok(await startInvoicePayment(token));
  });
}
