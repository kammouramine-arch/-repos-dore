import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { signInSchema } from '@/server/validation';
import { signIn } from '@/server/services/authService';
import {
  clientIpFrom,
  destroySession,
  issueSessionToken,
  requireAuth,
} from '@/lib/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { buildSessionDTO, buildSessionDTOFor } from '@/server/services/sessionDto';

const bodySchema = signInSchema.extend({
  deviceName: z.string().trim().max(80).optional(),
});

/** Contexte de session courant (web via cookie, mobile via jeton porteur). */
export async function GET() {
  return route(async () => {
    const auth = await requireAuth();
    return ok(await buildSessionDTO(auth));
  });
}

/** Connexion : renvoie un jeton porteur utilisable par l'application mobile. */
export async function POST(request: Request) {
  return route(async () => {
    const body = await parseBody(request, bodySchema);
    const ip = clientIpFrom(await headers());
    await enforceRateLimit({ key: `login:${ip}:${body.email}`, ...RATE_LIMITS.login });

    const { user, organizationId } = await signIn({
      email: body.email,
      password: body.password,
      ip,
    });
    const { token, expiresAt } = await issueSessionToken(user.id, { deviceName: body.deviceName });

    return ok({
      token,
      expiresAt: expiresAt.toISOString(),
      session: await buildSessionDTOFor(user.id, organizationId),
    });
  });
}

/** Déconnexion : révoque la session portée par le cookie ou le jeton. */
export async function DELETE() {
  return route(async () => {
    await destroySession();
    return ok({ signedOut: true });
  });
}
