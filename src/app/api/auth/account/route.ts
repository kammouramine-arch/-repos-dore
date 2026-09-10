import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { deletePersonalAccount } from '@/server/services/accountService';

export async function DELETE(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, z.object({ password: z.string().min(1), confirmation: z.literal('SUPPRIMER') }).strict());
    return ok(await deletePersonalAccount(auth.user.id, body.password, body.confirmation));
  });
}
