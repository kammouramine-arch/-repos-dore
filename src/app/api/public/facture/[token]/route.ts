import { ok, route } from '@/server/api';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { publicInvoice } from '@/server/services/paymentAccountService';

type Params = { params: Promise<{ token: string }> };

/**
 * La facture vue par le client de l'artisan, sans authentification.
 *
 * Le jeton du lien fait autorité. Une limite de débit s'applique : sans elle,
 * la route permettrait d'essayer des jetons au hasard.
 */
export async function GET(request: Request, { params }: Params) {
  return route(async () => {
    const token = (await params).token;
    await enforceRateLimit({ key: `facture:${token}`, ...RATE_LIMITS.publicQuoteAction });
    return ok(await publicInvoice(token));
  });
}
