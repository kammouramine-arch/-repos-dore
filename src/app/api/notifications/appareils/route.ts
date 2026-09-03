import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { registerDevice, unregisterDevice } from '@/server/services/notificationService';
import { isExpoPushToken } from '@/lib/push';
import { validation } from '@/lib/errors';

const registerSchema = z.object({
  token: z.string().trim().min(10).max(200),
  platform: z.enum(['ios', 'android', 'web']),
  deviceName: z.string().trim().max(80).optional(),
  appVersion: z.string().trim().max(32).optional(),
});

/** Enregistrement du jeton push d'un appareil mobile. */
export async function POST(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, registerSchema);
    if (!isExpoPushToken(body.token)) {
      throw validation("Jeton de notification invalide.");
    }

    await registerDevice({
      organizationId: auth.organization.organizationId,
      userId: auth.user.id,
      token: body.token,
      platform: body.platform.toUpperCase() as 'IOS' | 'ANDROID' | 'WEB',
      deviceName: body.deviceName,
      appVersion: body.appVersion,
    });

    return ok({ registered: true });
  });
}

export async function DELETE(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const body = await parseBody(request, z.object({ token: z.string().trim().min(10).max(200) }));
    const removed = await unregisterDevice(auth.organization.organizationId, body.token);
    return ok({ removed });
  });
}
