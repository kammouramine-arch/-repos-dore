import 'server-only';
import type { QuoteStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { businessComplete, type SetupStatus } from '@devisia/shared';
import { fullName } from '@/lib/utils';

/**
 * Ce que l'accueil web ajoute au tableau de bord partagé : la répartition des
 * devis par statut, les derniers devis et clients, et l'état de mise en route.
 * Lecture seule, isolée par entreprise.
 */
export interface HomeOverview {
  statusCounts: Record<'BROUILLON' | 'ENVOYE' | 'CONSULTE' | 'EXPIRE' | 'ANNULE', number>;
  totalQuotes: number;
  recentQuotes: {
    id: string;
    number: string;
    title: string;
    status: QuoteStatus;
    totalCents: number;
    customerName: string;
    createdAt: string;
    sentAt: string | null;
    viewCount: number;
  }[];
  recentCustomers: { id: string; name: string; city: string | null; email: string | null; createdAt: string; quoteCount: number }[];
  setup: SetupStatus;
  customerCount: number;
}

const VIEWED: QuoteStatus[] = ['CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE'];

export async function getHomeOverview(organizationId: string): Promise<HomeOverview> {
  const [grouped, recentQuotes, recentCustomers, profile, catalogueCount, customerCount] = await Promise.all([
    prisma.quote.groupBy({ by: ['status'], where: { organizationId, deletedAt: null }, _count: true }),
    prisma.quote.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: { customer: { select: { firstName: true, lastName: true, companyName: true } } },
    }),
    prisma.customer.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { _count: { select: { quotes: { where: { deletedAt: null } } } } },
    }),
    prisma.businessProfile.findUnique({
      where: { organizationId },
      select: { siret: true, vatNumber: true, addressLine1: true, city: true, phone: true },
    }),
    prisma.priceBookItem.count({ where: { organizationId, deletedAt: null } }),
    prisma.customer.count({ where: { organizationId, deletedAt: null } }),
  ]);

  const statusCounts = { BROUILLON: 0, ENVOYE: 0, CONSULTE: 0, EXPIRE: 0, ANNULE: 0 };
  let totalQuotes = 0;
  for (const row of grouped) {
    totalQuotes += row._count;
    if (VIEWED.includes(row.status)) statusCounts.CONSULTE += row._count;
    else if (row.status in statusCounts) statusCounts[row.status as keyof typeof statusCounts] += row._count;
  }

  return {
    statusCounts,
    totalQuotes,
    recentQuotes: recentQuotes.map((quote) => ({
      id: quote.id,
      number: quote.number,
      title: quote.title,
      status: quote.status,
      totalCents: quote.totalCents,
      customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
      createdAt: quote.createdAt.toISOString(),
      sentAt: quote.sentAt?.toISOString() ?? null,
      viewCount: quote.viewCount,
    })),
    recentCustomers: recentCustomers.map((customer) => ({
      id: customer.id,
      name: fullName(customer.firstName, customer.lastName, customer.companyName),
      city: customer.city,
      email: customer.email,
      createdAt: customer.createdAt.toISOString(),
      quoteCount: customer._count.quotes,
    })),
    setup: { business: businessComplete(profile), catalogue: catalogueCount > 0, clients: customerCount > 0 },
    customerCount,
  };
}
