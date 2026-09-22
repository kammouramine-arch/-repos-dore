import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { ok, parseBody, route } from '@/server/api';
import { claimAcquisition } from '@/server/services/acquisitionService';

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requireAuth({ requireVerified: false });
    await parseBody(request, z.object({ consent: z.literal('meta-v1-att-authorized') }).strict());
    const user = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { createdAt: true } });
    const age = user ? Date.now() - user.createdAt.getTime() : Infinity;
    // Never turn an old login or a later opt-in into a new registration.
    const event = age >= 0 && age <= 10 * 60 * 1000
      ? await claimAcquisition(`registration:${auth.user.id}`, { name: 'fb_mobile_complete_registration' }) : null;
    return ok({ event });
  });
}
