import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { handleAppleNotification } from '@/server/services/appleBillingService';

export async function POST(request: Request) {
  return route(async () => {
    const body = await parseBody(request, z.object({ signedPayload: z.string().min(20).max(60_000) }));
    return ok(await handleAppleNotification(body.signedPayload));
  });
}
