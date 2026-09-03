import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { leadSchema } from '@/server/validation';
import { updateLead } from '@/server/services/leadService';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('lead:write');
    const id = idSchema.parse((await params).id);
    const body = await parseBody(request, leadSchema.partial());
    const lead = await updateLead(auth.organization.organizationId, auth.user.id, id, body);
    return ok(lead);
  });
}
