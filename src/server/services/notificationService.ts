import 'server-only';
import type { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { sendPush } from '@/lib/push';

export interface NotificationInput {
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  /** Destinataire précis ; sinon la notification est visible par toute l'organisation. */
  userId?: string | null;
}

/**
 * Crée une notification interne et la relaie en push mobile.
 * L'échec d'un push n'invalide jamais l'action métier à l'origine.
 */
export async function notify(input: NotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });

  void pushToDevices(input).catch((error) => console.error('[push] notification non relayée', error));
  return notification;
}

/** Relais vers les appareils mobiles enregistrés de l'organisation. */
async function pushToDevices(input: NotificationInput) {
  if (!env().PUSH_ENABLED) return;

  const devices = await prisma.deviceToken.findMany({
    where: {
      organizationId: input.organizationId,
      disabledAt: null,
      ...(input.userId ? { userId: input.userId } : {}),
    },
    select: { token: true },
  });
  if (devices.length === 0) return;

  const unread = await prisma.notification.count({
    where: { organizationId: input.organizationId, readAt: null },
  });

  const result = await sendPush({
    tokens: devices.map((device) => device.token),
    title: input.title,
    body: input.body,
    badge: unread,
    data: {
      type: input.type,
      ...(input.href ? { href: input.href } : {}),
    },
  });

  if (result.invalidTokens.length > 0) {
    await prisma.deviceToken.updateMany({
      where: { token: { in: result.invalidTokens } },
      data: { disabledAt: new Date() },
    });
  }
}

/** Enregistre ou réactive le jeton push d'un appareil. */
export async function registerDevice(input: {
  organizationId: string;
  userId: string;
  token: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
  deviceName?: string | null;
  appVersion?: string | null;
}) {
  return prisma.deviceToken.upsert({
    where: { token: input.token },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      token: input.token,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      appVersion: input.appVersion ?? null,
    },
    update: {
      organizationId: input.organizationId,
      userId: input.userId,
      platform: input.platform,
      deviceName: input.deviceName ?? undefined,
      appVersion: input.appVersion ?? undefined,
      disabledAt: null,
      lastSeenAt: new Date(),
    },
  });
}

/** Désenregistre un appareil (déconnexion ou refus des notifications). */
export async function unregisterDevice(organizationId: string, token: string) {
  const result = await prisma.deviceToken.updateMany({
    where: { token, organizationId },
    data: { disabledAt: new Date() },
  });
  return result.count > 0;
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
