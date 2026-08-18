import { requireAuth } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { countUnread, listNotifications, markAllRead } from '@/server/services/notificationService';

export async function GET() {
  return route(async () => {
    const auth = await requireAuth();
    const organizationId = auth.organization.organizationId;
    const [items, unread] = await Promise.all([
      listNotifications(organizationId, 25),
      countUnread(organizationId),
    ]);

    return ok({
      unread,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        href: item.href,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  });
}

export async function POST() {
  return route(async () => {
    const auth = await requireAuth();
    await markAllRead(auth.organization.organizationId);
    return ok({ read: true });
  });
}
