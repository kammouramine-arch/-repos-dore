import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { signQuote } from '@/server/services/signatureService';

type Params = { params: Promise<{ token: string }> };

const schema = z.object({
  signerName: z.string().min(2).max(120),
  signerEmail: z.string().email().max(160).optional(),
  strokePath: z.string().min(8).max(24000),
  accepted: z.literal(true),
});

/**
 * Signature d'un devis par le client, depuis son lien public.
 *
 * Aucune authentification : le client de l'artisan n'a pas de compte DEVISERA
 * et ne doit pas avoir à en créer un. Le jeton du lien, long et non devinable,
 * est ce qui autorise l'accès ; une limite de débit par jeton empêche de le
 * marteler.
 */
export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const token = (await params).token;
    await enforceRateLimit({ key: `sign:${token}`, ...RATE_LIMITS.publicQuoteAction });
    const input = await parseBody(request, schema);
    const signature = await signQuote(token, input, {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
    });
    return ok(signature, { status: 201 });
  });
}
