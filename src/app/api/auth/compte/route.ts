import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { updateAccountName } from '@/server/services/accountService';

export async function PATCH(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, z.object({ firstName: z.string().trim().max(80), lastName: z.string().trim().max(80) }).strict());
    await updateAccountName(auth.user.id, body.firstName, body.lastName);
    return ok({ saved: true });
  });
}
