import { z } from 'zod';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { confirmEmailCode, normalizeEmailCode, requestEmailCode, emailCodeStatus } from '@/server/services/accountService';
import { buildSessionDTO } from '@/server/services/sessionDto';

export async function GET() {
  return route(async () => {
    const auth = await requireAuth();
    return ok(await emailCodeStatus(auth.user.id), { headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    await enforceRateLimit({ key: `email-change:${auth.user.id}`, ...RATE_LIMITS.login });
    const body = await parseBody(request, z.object({ email: z.string().trim().email().max(254), password: z.string().max(128).optional() }).strict());
    return ok(await requestEmailCode(auth.user.id, { ...body, language: auth.user.locale }));
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, z.object({
      code: z.string().transform(normalizeEmailCode).refine((value) => /^\d{6}$/.test(value), 'Code à six chiffres requis.'),
    }).strict());
    const result = await confirmEmailCode(auth.user.id, auth.sessionId, body.code);
    // Re-read the authenticated context after the transaction. Returning the
    // pre-confirmation context here was a subtle source of screens remaining
    // stuck on verification until a full app restart.
    const refreshed = await requireAuth();
    return ok({ ...result, session: await buildSessionDTO(refreshed) });
  });
}
