import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { NOTIFICATION_CATEGORIES } from '@devisia/shared';
import { notificationPreferences, updateNotificationPreferences } from '@/server/services/notificationService';

/**
 * Catégories de notifications que l'utilisateur accepte de recevoir.
 *
 * Les préférences sont portées par l'utilisateur et non par l'organisation :
 * deux associés du même atelier n'ont pas les mêmes journées, et l'un peut
 * vouloir être réveillé par une acceptation quand l'autre non.
 */
const bodySchema = z
  .object(Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => [category, z.boolean().optional()])))
  .strict();

export async function GET() {
  return route(async () => {
    const auth = await requireAuth({ requireVerified: true });
    return ok({ categories: await notificationPreferences(auth.user.id) });
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    const auth = await requireAuth({ requireVerified: true });
    const body = await parseBody(request, bodySchema);
    return ok({ categories: await updateNotificationPreferences(auth.user.id, body) });
  });
}
