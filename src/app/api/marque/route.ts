import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { getBranding, updateBranding } from '@/server/services/brandingService';

const schema = z.object({
  legalName: z.string().trim().min(2).max(120).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  documentTemplate: z.enum(['MINIMAL', 'MODERNE', 'EXECUTIF']).optional(),
  documentFooter: z.string().trim().max(400).nullish(),
  paymentDetails: z.string().trim().max(400).nullish(),
  logoFileId: z.string().uuid().nullish(),
  signatureFileId: z.string().uuid().nullish(),
});

export async function GET() {
  return route(async () => {
    const auth = await requirePermission('settings:read');
    return ok(await getBranding(auth.organization.organizationId));
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    const auth = await requirePermission('settings:write');
    const input = await parseBody(request, schema);
    return ok(await updateBranding(auth.organization.organizationId, auth.user.id, input));
  });
}
