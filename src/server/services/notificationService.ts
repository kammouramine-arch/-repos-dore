import 'server-only';
import type { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface NotificationInput {
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  /** Destinataire précis ; sinon la notification est visible par toute l'organisation. */
  userId?: string | null;
}

export async function notify(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
}

export async function listNotifications(organizationId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function countUnread(organizationId: string) {
  return prisma.notification.count({ where: { organizationId, readAt: null } });
}

export async function markAllRead(organizationId: string) {
  await prisma.notification.updateMany({
    where: { organizationId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markRead(organizationId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, organizationId },
    data: { readAt: new Date() },
  });
}
