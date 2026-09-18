import 'server-only';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';

const languageSchema = z.enum(['fr', 'en']);
const sourceSchema = z.enum(['explicit', 'inferred', 'reset']);

/**
 * Preferred language of a user. A personal preference, never a change of tax
 * jurisdiction or currency.
 *
 * - `explicit`: the user chose it; recorded with a timestamp and authoritative
 *   on every device until they choose again.
 * - `inferred`: the device language reported by a client. Applied only while
 *   no explicit choice exists, so an account created from a wrongly detected
 *   locale follows the phone once the client reports the right language.
 * - `reset`: forget the explicit choice and follow the device again.
 */
export async function updatePreferredLanguage(userId: string, language: unknown, organizationId?: string, source: unknown = 'explicit') {
  const locale = languageSchema.parse(language);
  const origin = sourceSchema.parse(source);
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findFirst({ where: { id: userId, deletedAt: null }, select: { locale: true, localeChosenAt: true } });
    if (!current) return null;

    // An inferred value never overrides a choice the user made.
    if (origin === 'inferred' && current.localeChosenAt) return { locale: current.locale, localeChosenAt: current.localeChosenAt };

    const localeChosenAt = origin === 'explicit' ? now : null;
    await tx.user.updateMany({ where: { id: userId, deletedAt: null }, data: { locale, localeChosenAt } });

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
    return { locale, localeChosenAt };
  });
  if (!result) throw notFound('Compte introuvable.');
  return { language: result.locale, localeChosenAt: result.localeChosenAt ? result.localeChosenAt.toISOString() : null };
}
