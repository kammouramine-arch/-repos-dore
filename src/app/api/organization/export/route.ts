import { requirePermission } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { exportBusinessData } from '@/server/services/businessExportService';

export async function GET() {
  return route(async () => {
    const auth = await requirePermission('customer:read');
    const response = ok(await exportBusinessData(auth.organization.organizationId));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  });
}
