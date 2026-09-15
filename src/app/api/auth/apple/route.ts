import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { clientIpFrom, issueSessionToken } from '@/lib/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { buildSessionDTOFor } from '@/server/services/sessionDto';
import { exchangeAppleAuthorizationCode, verifyAppleIdentityToken } from '@/server/auth/providers/apple';
import { authenticateWithIdentity } from '@/server/services/identityService';

const bodySchema = z.object({
  identityToken: z.string().min(20).max(8_000),
  authorizationCode: z.string().max(2_000).nullish(),
  nonce: z.string().min(8).max(200).nullish(),
  fullName: z.object({ givenName: z.string().max(120).nullish(), familyName: z.string().max(120).nullish() }).nullish(),
  deviceName: z.string().trim().max(80).optional(),
  locale: z.enum(['fr', 'en']).optional(),
}).strict();

/**
 * Sign in with Apple (flux natif). Le jeton d'identité est vérifié avec les
 * clés publiques d'Apple ; aucun code par email n'est demandé ensuite : Apple
 * a déjà vérifié l'adresse (réelle ou relayée).
 */
export async function POST(request: Request) {
  return route(async () => {
    const body = await parseBody(request, bodySchema);
    const ip = clientIpFrom(await headers());
    await enforceRateLimit({ key: `identity:${ip}`, ...RATE_LIMITS.login });

    const identity = await verifyAppleIdentityToken({ identityToken: body.identityToken, nonce: body.nonce, fullName: body.fullName });
    const appleRefreshToken = body.authorizationCode ? await exchangeAppleAuthorizationCode(body.authorizationCode) : null;
    const result = await authenticateWithIdentity({ identity, locale: body.locale, ip, appleRefreshToken, billingProvider: 'apple' });
    const { token, expiresAt } = await issueSessionToken(result.user.id, { deviceName: body.deviceName });
    return ok(
      { token, expiresAt: expiresAt.toISOString(), session: await buildSessionDTOFor(result.user.id, result.organizationId) },
      { status: result.outcome === 'created' ? 201 : 200 },
    );
  });
}
