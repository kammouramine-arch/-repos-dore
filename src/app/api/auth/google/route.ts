import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { clientIpFrom, issueSessionToken } from '@/lib/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { buildSessionDTOFor } from '@/server/services/sessionDto';
import { verifyGoogleIdToken } from '@/server/auth/providers/google';
import { authenticateWithIdentity } from '@/server/services/identityService';

const bodySchema = z.object({
  idToken: z.string().min(20).max(8_000),
  deviceName: z.string().trim().max(80).optional(),
  locale: z.enum(['fr', 'en']).optional(),
}).strict();

/**
 * Google Sign-In (flux natif). Le jeton d'identité est vérifié avec les clés
 * publiques de Google et son audience doit être un identifiant client de
 * DEVISERA. Google a vérifié l'adresse : aucun code par email ensuite.
 */
export async function POST(request: Request) {
  return route(async () => {
    const body = await parseBody(request, bodySchema);
    const ip = clientIpFrom(await headers());
    await enforceRateLimit({ key: `identity:${ip}`, ...RATE_LIMITS.login });

    const identity = await verifyGoogleIdToken(body.idToken);
    const result = await authenticateWithIdentity({ identity, locale: body.locale, ip, billingProvider: 'apple' });
    const { token, expiresAt } = await issueSessionToken(result.user.id, { deviceName: body.deviceName });
    return ok(
      { token, expiresAt: expiresAt.toISOString(), session: await buildSessionDTOFor(result.user.id, result.organizationId) },
      { status: result.outcome === 'created' ? 201 : 200 },
    );
  });
}
