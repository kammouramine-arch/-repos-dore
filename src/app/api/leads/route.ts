import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, parseQuery, route } from '@/server/api';
import { leadSchema } from '@/server/validation';
import { createLead, listLeads } from '@/server/services/leadService';

const querySchema = z.object({
  q: z.string().max(120).optional(),
  statut: z
    .enum(['NOUVEAU', 'CONTACTE', 'QUALIFIE', 'DEVIS_ENVOYE', 'RELANCE', 'GAGNE', 'PERDU'])
    .optional(),
});

export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('lead:read');
    const query = parseQuery(request, querySchema);
    const leads = await listLeads(auth.organization.organizationId, {
      search: query.q,
      status: query.statut,
    });
    return ok(leads);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('lead:write');
    const body = await parseBody(request, leadSchema);
    const lead = await createLead(auth.organization.organizationId, auth.user.id, body);
    return ok(lead, { status: 201 });
  });
}
