import 'server-only';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';

/** A personal preference, never a change of tax jurisdiction or currency. */
export async function updatePreferredLanguage(userId: string, language: unknown, organizationId?: string) {
  const locale = z.enum(['fr', 'en']).parse(language);
  const changed = await prisma.$transaction(async (tx) => {
    const user = await tx.user.updateMany({ where: { id: userId, deletedAt: null }, data: { locale } });
    if (user.count !== 1) return false;

    // The owner’s language is also the organization’s document/email language.
    // Team members keep a personal UI preference without changing shared
    // business documents for everyone else.
    if (organizationId) {
      const membership = await tx.organizationMember.findFirst({
        where: { organizationId, userId, deletedAt: null },
        select: { role: true },
      });
      if (membership?.role === 'OWNER') {
        await tx.organization.updateMany({ where: { id: organizationId, deletedAt: null }, data: { locale } });
      }
    }
    return true;
  });
  if (!changed) throw notFound('Compte introuvable.');
  return { language: locale };
}
