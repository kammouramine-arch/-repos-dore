import { ok, route } from '@/server/api';
import { invitationPreview } from '@/server/services/teamService';
import { validation } from '@/lib/errors';

export async function GET(request: Request) {
  return route(async () => {
    const token = new URL(request.url).searchParams.get('token');
    if (!token) throw validation('Invitation manquante.');
    const preview = await invitationPreview(token);
    return ok({ ...preview, expiresAt: preview.expiresAt.toISOString() });
  });
}
