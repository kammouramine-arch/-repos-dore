import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { clientIpFrom, requireAuth } from '@/lib/auth/session';
import { acceptInvitation } from '@/server/services/teamService';

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requireAuth({ requireVerified: true });
    const body = await parseBody(request, z.object({ token: z.string().min(20).max(200) }).strict());
    const result = await acceptInvitation(auth, body.token, clientIpFrom(await headers()));
    return ok({ accepted: true, ...result });
  });
}
