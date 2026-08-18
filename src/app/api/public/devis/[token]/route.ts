import { headers } from 'next/headers';
import { ok, parseBody, route } from '@/server/api';
import { publicDecisionSchema } from '@/server/validation';
import { registerClientDecision } from '@/server/services/quoteService';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { hashIp } from '@/lib/auth/tokens';
import { clientIpFrom } from '@/lib/auth/session';

type Params = { params: Promise<{ token: string }> };

/** Décision du client depuis la page publique du devis. Aucune authentification. */
export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const { token } = await params;
    const ip = clientIpFrom(await headers());
    await enforceRateLimit({ key: `devis-public:${ip ?? token}`, ...RATE_LIMITS.publicQuoteAction });

    const body = await parseBody(request, publicDecisionSchema);
    const quote = await registerClientDecision(token, body.decision, {
      message: body.message,
      signatureName: body.signatureName,
      ipHash: hashIp(ip),
    });

    return ok({ status: quote.status });
  });
}
