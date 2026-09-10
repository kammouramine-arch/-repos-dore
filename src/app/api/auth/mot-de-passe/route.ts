import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { emailSchema } from '@/server/validation';
import { requestPasswordReset } from '@/server/services/authService';
import { clientIpFrom } from '@/lib/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const bodySchema = z.object({ email: emailSchema });

/** Demande de réinitialisation — réponse identique que le compte existe ou non. */
export async function POST(request: Request) {
  return route(async () => {
    const body = await parseBody(request, bodySchema);
    const ip = clientIpFrom(await headers());
    await enforceRateLimit({ key: `reset:${ip}`, ...RATE_LIMITS.passwordReset });
    await requestPasswordReset(body.email);
    return ok({ requested: true });
  });
}
