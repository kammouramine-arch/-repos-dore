import { requireAuth } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { exportPersonalAccount } from '@/server/services/personalExportService';

export async function GET() {
  return route(async () => {
    const auth = await requireAuth();
    const response = ok(await exportPersonalAccount(auth.user.id));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  });
}
