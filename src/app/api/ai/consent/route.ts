import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { getAiConsent, recordAiConsent } from '@/server/services/aiConsentService';

/** Décision courante de l'utilisateur sur l'envoi de données au fournisseur d'IA. */
export async function GET() {
  return route(async () => {
    const auth = await requireAuth();
    return ok(await getAiConsent(auth.user.id, auth.organization.organizationId));
  });
}

const bodySchema = z.object({
  status: z.enum(['GRANTED', 'DECLINED', 'REVOKED']),
  version: z.number().int().positive(),
});

/** Enregistre une décision explicite : accorder, refuser ou retirer. */
export async function PUT(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, bodySchema);
    return ok(await recordAiConsent(auth.user.id, auth.organization.organizationId, body.status, body.version));
  });
}
