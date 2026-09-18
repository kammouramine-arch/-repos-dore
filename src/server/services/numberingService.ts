import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type DocumentKind = 'QUOTE' | 'INVOICE';

const PREFIX: Record<DocumentKind, string> = {
  QUOTE: 'DEV',
  INVOICE: 'FAC',
};

/**
 * Numérotation séquentielle par entreprise et par année : DEV-2026-0001.
 *
 * L'incrément se fait dans une transaction avec verrouillage de la ligne de
 * compteur, ce qui garantit l'absence de collision même en cas de créations
 * simultanées.
 */
export async function nextDocumentNumber(
  organizationId: string,
  kind: DocumentKind,
  client: Prisma.TransactionClient | typeof prisma = prisma,
  year = new Date().getFullYear(),
): Promise<string> {
  const counter = await client.documentCounter.upsert({
    where: { organizationId_kind_year: { organizationId, kind, year } },
    create: { organizationId, kind, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return formatDocumentNumber(kind, year, counter.lastNumber);
}

export function formatDocumentNumber(kind: DocumentKind, year: number, sequence: number): string {
  return `${PREFIX[kind]}-${year}-${String(sequence).padStart(4, '0')}`;
}
