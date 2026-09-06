import 'server-only';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';

/** A personal preference, never a change of tax jurisdiction or currency. */
export async function updatePreferredLanguage(userId: string, language: unknown) {
  const locale = z.enum(['fr', 'en']).parse(language);
  const changed = await prisma.user.updateMany({ where: { id: userId, deletedAt: null }, data: { locale } });
  if (changed.count !== 1) throw notFound('Compte introuvable.');
  return { language: locale };
}
