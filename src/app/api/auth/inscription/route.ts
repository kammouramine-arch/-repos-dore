import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { signUpSchema } from '@/server/validation';
import { signUp } from '@/server/services/authService';
import { clientIpFrom, issueSessionToken } from '@/lib/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { buildSessionDTOFor } from '@/server/services/sessionDto';

const bodySchema = signUpSchema.extend({
  deviceName: z.string().trim().max(80).optional(),
  // Native registration must not mint a local trial when an older binary
  // omits the provider. The web signup action has its own explicit policy.
  billingProvider: z.literal('apple').default('apple'),
  verificationMethod: z.literal('code').optional(),
  invitationToken: z.string().trim().min(20).max(200).optional(),
});

/** Inscription depuis l'application mobile : compte, entreprise et jeton. */
export async function POST(request: Request) {
  return route(async () => {
    const body = await parseBody(request, bodySchema);
    const ip = clientIpFrom(await headers());
    await enforceRateLimit({ key: `signup:${ip}`, ...RATE_LIMITS.signup });

    const { user, organization, existingPending } = await signUp({ ...body, ip });
    const { token, expiresAt } = await issueSessionToken(user.id, { deviceName: body.deviceName });

    return ok(
      {
        token,
        expiresAt: expiresAt.toISOString(),
        session: await buildSessionDTOFor(user.id, organization.id),
      },
      { status: existingPending ? 200 : 201 },
    );
  });
}
