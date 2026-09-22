import 'server-only';
import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { AcquisitionEvent } from '@devisia/shared/acquisition';

/** A single SDK sender. Reserve before returning, so concurrent devices cannot double-send.
 * This intentionally provides at-most-once handoff, not guaranteed delivery: if the client
 * disappears after claiming, the event is lost rather than retried as duplicate revenue.
 */
export async function claimAcquisition(key: string, event: Omit<AcquisitionEvent, 'id'>): Promise<AcquisitionEvent | null> {
  const secret = process.env.META_EVENT_KEY_SECRET;
  if (process.env.META_APP_EVENTS_ENABLED !== 'true' || !secret || secret.length < 32) return null;
  const id = createHmac('sha256', secret).update(`meta-v1:${key}`).digest('hex');
  try {
    const result = await prisma.metaEventClaim.createMany({ data: [{ id }], skipDuplicates: true });
    return result.count === 1 ? { ...event, id } : null;
  } catch {
    // Analytics/migration availability must never affect sign-in or paid entitlement.
    return null;
  }
}
