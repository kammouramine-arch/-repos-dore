import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { cancelFollowUp, sendFollowUp } from '@/server/services/followUpService';

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  subject: z.string().trim().max(160).optional(),
  body: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('followup:send');
    const id = idSchema.parse((await params).id);
    const payload = await parseBody(request, bodySchema);
    const record = await sendFollowUp({
      organizationId: auth.organization.organizationId,
      userId: auth.user.id,
      followUpId: id,
      subject: payload.subject,
      body: payload.body,
    });
    return ok({ id: record.id, status: record.status });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('followup:send');
    const id = idSchema.parse((await params).id);
    await cancelFollowUp(auth.organization.organizationId, id);
    return ok({ cancelled: true });
  });
}
