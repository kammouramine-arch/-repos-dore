import { z } from 'zod';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { confirmEmailCode, requestEmailCode } from '@/server/services/accountService';

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    await enforceRateLimit({ key: `email-change:${auth.user.id}`, ...RATE_LIMITS.login });
    const body = await parseBody(request, z.object({ email: z.string().trim().email().max(254), password: z.string().max(128).optional() }).strict());
    return ok(await requestEmailCode(auth.user.id, body));
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, z.object({ code: z.string().regex(/^\d{6}$/) }).strict());
    return ok(await confirmEmailCode(auth.user.id, auth.sessionId, body.code));
  });
}
