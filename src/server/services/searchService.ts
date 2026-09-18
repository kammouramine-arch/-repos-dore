import 'server-only';
import { prisma } from '@/lib/prisma';
import { fullName } from '@/lib/utils';

export interface SearchResult {
  type: 'customer' | 'lead' | 'quote' | 'job';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/** Recherche globale, strictement limitée à l'organisation active. */
export async function globalSearch(organizationId: string, query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const contains = { contains: term, mode: 'insensitive' as const };

  const [customers, leads, quotes, jobs] = await Promise.all([
    prisma.customer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { firstName: contains },
          { lastName: contains },
          { companyName: contains },
          { email: contains },
          { phone: contains },
        ],
      },
      take: 5,
    }),
    prisma.lead.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ contactName: contains }, { title: contains }, { phone: contains }, { email: contains }],
      },
      take: 5,
    }),
    prisma.quote.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ number: contains }, { title: contains }],
      },
      take: 5,
      include: { customer: true },
    }),
    prisma.job.findMany({
      where: { organizationId, deletedAt: null, OR: [{ title: contains }, { city: contains }] },
      take: 4,
    }),
  ]);

  return [
    ...quotes.map((quote) => ({
      type: 'quote' as const,
      id: quote.id,
      title: `${quote.number} — ${quote.title}`,
      subtitle: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
      href: `/app/devis/${quote.id}`,
    })),
    ...customers.map((customer) => ({
      type: 'customer' as const,
      id: customer.id,
      title: fullName(customer.firstName, customer.lastName, customer.companyName),
      subtitle: customer.city ?? customer.email,
      href: `/app/clients/${customer.id}`,
    })),
    ...leads.map((lead) => ({
      type: 'lead' as const,
      id: lead.id,
      title: lead.contactName,
      subtitle: lead.title,
      href: `/app/prospects/${lead.id}`,
    })),
    ...jobs.map((job) => ({
      type: 'job' as const,
      id: job.id,
      title: job.title,
      subtitle: job.city,
      href: `/app/chantiers/${job.id}`,
    })),
  ];
}
