import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { deletePersonalAccount } from '@/server/services/accountService';

export async function DELETE(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    // Le mot de passe n'existe pas pour un compte Apple/Google : la session
    // authentifiée et le mot SUPPRIMER suffisent alors.
    const body = await parseBody(request, z.object({ password: z.string().min(1).optional(), confirmation: z.literal('SUPPRIMER') }).strict());
    return ok(await deletePersonalAccount(auth.user.id, body.password ?? null, body.confirmation));
  });
}
