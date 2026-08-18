import 'server-only';
import { prisma } from '@/lib/prisma';
import { revenueToRecover } from './followUpService';

export type DashboardPeriod = 7 | 30 | 90 | 365;

export interface DashboardMetrics {
  period: DashboardPeriod;
  revenueWonCents: number;
  revenuePotentialCents: number;
  quotesSent: number;
  quotesAccepted: number;
  acceptanceRate: number;
  averageQuoteCents: number;
  pendingQuotes: number;
  newLeads: number;
  conversionRate: number;
  previous: {
    revenueWonCents: number;
    quotesSent: number;
    acceptanceRate: number;
  };
  series: { date: string; wonCents: number; sentCents: number; quotes: number }[];
  funnel: { label: string; value: number }[];
  topServices: { label: string; count: number; revenueCents: number }[];
  toRecover: Awaited<ReturnType<typeof revenueToRecover>>;
}

function startOf(daysAgo: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Indicateurs du tableau de bord, orientés chiffre d'affaires. */
export async function getDashboardMetrics(
  organizationId: string,
  period: DashboardPeriod = 30,
): Promise<DashboardMetrics> {
  const since = startOf(period);
  const previousSince = startOf(period * 2);

  const [quotes, previousQuotes, leads, previousLeads, toRecover, acceptedItems] = await Promise.all([
    prisma.quote.findMany({
      where: { organizationId, deletedAt: null, createdAt: { gte: since } },
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        sentAt: true,
        acceptedAt: true,
      },
    }),
    prisma.quote.findMany({
      where: {
        organizationId,
        deletedAt: null,
        createdAt: { gte: previousSince, lt: since },
      },
      select: { status: true, totalCents: true, sentAt: true, acceptedAt: true },
    }),
    prisma.lead.count({ where: { organizationId, deletedAt: null, createdAt: { gte: since } } }),
    prisma.lead.count({
      where: { organizationId, deletedAt: null, createdAt: { gte: previousSince, lt: since } },
    }),
    revenueToRecover(organizationId),
    prisma.quoteItem.findMany({
      where: {
        quote: { organizationId, deletedAt: null, status: 'ACCEPTE', acceptedAt: { gte: since } },
      },
      select: { label: true, lineTotalCents: true },
    }),
  ]);

  const sent = quotes.filter((quote) => quote.sentAt != null);
  const accepted = quotes.filter((quote) => quote.status === 'ACCEPTE');
  const previousSent = previousQuotes.filter((quote) => quote.sentAt != null);
  const previousAccepted = previousQuotes.filter((quote) => quote.status === 'ACCEPTE');

  const revenueWonCents = accepted.reduce((acc, quote) => acc + quote.totalCents, 0);
  const acceptanceRate = sent.length === 0 ? 0 : Math.round((accepted.length / sent.length) * 100);
  const previousAcceptance =
    previousSent.length === 0 ? 0 : Math.round((previousAccepted.length / previousSent.length) * 100);

  // Série journalière (ou hebdomadaire sur les longues périodes).
  const buckets = new Map<string, { wonCents: number; sentCents: number; quotes: number }>();
  const step = period > 90 ? 7 : 1;
  for (let i = period; i >= 0; i -= step) {
    buckets.set(dayKey(startOf(i)), { wonCents: 0, sentCents: 0, quotes: 0 });
  }
  const keys = [...buckets.keys()];
  const bucketFor = (date: Date) => {
    const key = dayKey(date);
    if (buckets.has(key)) return key;
    return keys.find((candidate) => candidate >= key) ?? keys[keys.length - 1];
  };

  for (const quote of quotes) {
    if (quote.sentAt) {
      const key = bucketFor(quote.sentAt);
      const bucket = key ? buckets.get(key) : undefined;
      if (bucket) {
        bucket.sentCents += quote.totalCents;
        bucket.quotes += 1;
      }
    }
    if (quote.acceptedAt) {
      const key = bucketFor(quote.acceptedAt);
      const bucket = key ? buckets.get(key) : undefined;
      if (bucket) bucket.wonCents += quote.totalCents;
    }
  }

  const services = new Map<string, { count: number; revenueCents: number }>();
  for (const item of acceptedItems) {
    const key = item.label.trim().toLowerCase();
    const entry = services.get(key) ?? { count: 0, revenueCents: 0 };
    entry.count += 1;
    entry.revenueCents += item.lineTotalCents;
    services.set(key, entry);
  }

  const viewed = quotes.filter((quote) => ['CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE'].includes(quote.status));

  return {
    period,
    revenueWonCents,
    revenuePotentialCents: toRecover.totalCents,
    quotesSent: sent.length,
    quotesAccepted: accepted.length,
    acceptanceRate,
    averageQuoteCents: accepted.length === 0 ? 0 : Math.round(revenueWonCents / accepted.length),
    pendingQuotes: toRecover.quoteCount,
    newLeads: leads,
    conversionRate: leads === 0 ? 0 : Math.round((accepted.length / leads) * 100),
    previous: {
      revenueWonCents: previousAccepted.reduce((acc, quote) => acc + quote.totalCents, 0),
      quotesSent: previousSent.length,
      acceptanceRate: previousAcceptance,
    },
    series: [...buckets.entries()].map(([date, value]) => ({ date, ...value })),
    funnel: [
      { label: 'Prospects', value: leads + previousLeads * 0 },
      { label: 'Devis envoyés', value: sent.length },
      { label: 'Devis consultés', value: viewed.length },
      { label: 'Devis acceptés', value: accepted.length },
    ],
    topServices: [...services.entries()]
      .sort((a, b) => b[1].revenueCents - a[1].revenueCents)
      .slice(0, 5)
      .map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count: value.count,
        revenueCents: value.revenueCents,
      })),
    toRecover,
  };
}

/** Activité récente, toutes entités confondues. */
export async function getRecentActivity(organizationId: string, limit = 12) {
  const events = await prisma.quoteEvent.findMany({
    where: { quote: { organizationId, deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { quote: { select: { id: true, number: true, title: true, totalCents: true } } },
  });
  return events.map((event) => ({
    id: event.id,
    type: event.type,
    actor: event.actor,
    createdAt: event.createdAt.toISOString(),
    quoteId: event.quote.id,
    quoteNumber: event.quote.number,
    quoteTitle: event.quote.title,
    totalCents: event.quote.totalCents,
  }));
}
