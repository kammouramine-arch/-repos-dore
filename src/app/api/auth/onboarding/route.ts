import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { buildSessionDTO } from '@/server/services/sessionDto';
import { completeIdentityOnboarding } from '@/server/services/identityService';

const bodySchema = z.object({
  companyName: z.string().trim().min(2, "Nom de l'entreprise requis.").max(160),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  trade: z.string().trim().max(30).optional(),
}).strict();

/** Onboarding après une connexion Apple/Google : l'artisan nomme son entreprise. */
export async function POST(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, bodySchema);
    await completeIdentityOnboarding(auth.user.id, auth.organization.organizationId, body);
    const refreshed = await requireAuth();
    return ok({ session: await buildSessionDTO(refreshed) });
  });
}
