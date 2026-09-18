import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { updatePreferredLanguage } from '@/server/services/languageService';

export async function PATCH(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(
      request,
      z.object({ language: z.enum(['fr', 'en']), source: z.enum(['explicit', 'inferred', 'reset']).default('explicit') }).strict(),
    );
    return ok(await updatePreferredLanguage(auth.user.id, body.language, auth.organization.organizationId, body.source));
  });
}
