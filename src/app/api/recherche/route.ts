import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseQuery, route } from '@/server/api';
import { globalSearch } from '@/server/services/searchService';

const querySchema = z.object({ q: z.string().max(120).default('') });

export async function GET(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const { q } = parseQuery(request, querySchema);
    const results = await globalSearch(auth.organization.organizationId, q);
    return ok(results);
  });
}
