import 'server-only';
import type { Prisma, QuoteStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fullName } from '@/lib/utils';

/**
 * Liste des devis de l'espace web : recherche, filtres de statut, tri et
 * pagination, toujours bornés à l'entreprise appelante.
 */
export type QuoteListFilter = 'TOUS' | 'BROUILLON' | 'ENVOYE' | 'CONSULTE' | 'EXPIRE' | 'ANNULE' | 'CLOTURES';
export type QuoteListSort = 'recent' | 'amount' | 'customer' | 'validity';

export const QUOTE_LIST_FILTERS: QuoteListFilter[] = ['TOUS', 'BROUILLON', 'ENVOYE', 'CONSULTE', 'EXPIRE', 'ANNULE'];
export const QUOTE_LIST_SORTS: QuoteListSort[] = ['recent', 'amount', 'customer', 'validity'];
export const QUOTE_PAGE_SIZE = 25;

const VIEWED: QuoteStatus[] = ['CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE'];

function statusWhere(filter: QuoteListFilter): Prisma.QuoteWhereInput {
  switch (filter) {
    case 'TOUS':
      return {};
    case 'CONSULTE':
      return { status: { in: VIEWED } };
    case 'CLOTURES':
      return { status: { in: ['EXPIRE', 'ANNULE'] } };
    default:
      return { status: filter };
  }
}

function orderBy(sort: QuoteListSort): Prisma.QuoteOrderByWithRelationInput[] {
  switch (sort) {
    case 'amount':
      return [{ totalCents: 'desc' }, { createdAt: 'desc' }];
    case 'customer':
      return [{ customer: { lastName: 'asc' } }, { customer: { companyName: 'asc' } }, { createdAt: 'desc' }];
    case 'validity':
      return [{ validUntil: 'asc' }, { createdAt: 'desc' }];
    default:
      return [{ updatedAt: 'desc' }];
  }
}

export async function listQuotesForWeb(
  organizationId: string,
  options: { search?: string; filter?: QuoteListFilter; sort?: QuoteListSort; page?: number },
) {
  const search = options.search?.trim();
  const filter = options.filter ?? 'TOUS';
  const sort = options.sort ?? 'recent';
  const page = Math.max(1, options.page ?? 1);

  const where: Prisma.QuoteWhereInput = {
    organizationId,
    deletedAt: null,
    ...statusWhere(filter),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { customer: { firstName: { contains: search, mode: 'insensitive' } } },
            { customer: { lastName: { contains: search, mode: 'insensitive' } } },
            { customer: { companyName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [rows, total, grouped] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: orderBy(sort),
      skip: (page - 1) * QUOTE_PAGE_SIZE,
      take: QUOTE_PAGE_SIZE,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 1, select: { type: true, createdAt: true } },
      },
    }),
    prisma.quote.count({ where }),
    prisma.quote.groupBy({ by: ['status'], where: { organizationId, deletedAt: null }, _count: true }),
  ]);

  const counts: Record<QuoteListFilter, number> = { TOUS: 0, BROUILLON: 0, ENVOYE: 0, CONSULTE: 0, EXPIRE: 0, ANNULE: 0, CLOTURES: 0 };
  for (const row of grouped) {
    counts.TOUS += row._count;
    if (VIEWED.includes(row.status)) counts.CONSULTE += row._count;
    else if (row.status in counts) counts[row.status as QuoteListFilter] += row._count;
    if (row.status === 'EXPIRE' || row.status === 'ANNULE') counts.CLOTURES += row._count;
  }

  const now = Date.now();
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / QUOTE_PAGE_SIZE)),
    counts,
    items: rows.map((quote) => ({
      id: quote.id,
      number: quote.number,
      title: quote.title,
      status: quote.status,
      totalCents: quote.totalCents,
      customerId: quote.customer.id,
      customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
      customerEmail: quote.customer.email,
      createdAt: quote.createdAt.toISOString(),
      sentAt: quote.sentAt?.toISOString() ?? null,
      validUntil: quote.validUntil?.toISOString() ?? null,
      /** Validité dépassée alors que le client n'a pas répondu : à signaler dans la liste. */
      expired: quote.validUntil != null && quote.validUntil.getTime() < now && ['ENVOYE', 'CONSULTE'].includes(quote.status),
      viewCount: quote.viewCount,
      lastEvent: quote.events[0] ? { type: quote.events[0].type, at: quote.events[0].createdAt.toISOString() } : null,
      publicToken: quote.publicToken,
    })),
  };
}

export type WebQuoteRow = Awaited<ReturnType<typeof listQuotesForWeb>>['items'][number];
