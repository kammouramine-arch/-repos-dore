import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { ok, parseQuery, route } from '@/server/api';
import { getDashboardMetrics, getRecentActivity, type DashboardPeriod } from '@/server/services/dashboardService';
import type { DashboardDTO } from '@devisia/shared';

const querySchema = z.object({
  periode: z.coerce.number().int().optional(),
});

const ALLOWED: DashboardPeriod[] = [7, 30, 90, 365];

/** Indicateurs du tableau de bord, partagés par le web et le mobile. */
export async function GET(request: Request) {
  return route(async () => {
    const auth = await requireAuth();
    const { periode } = parseQuery(request, querySchema);
    const period = (ALLOWED.includes(periode as DashboardPeriod) ? periode : 30) as DashboardPeriod;
    const organizationId = auth.organization.organizationId;

    const [metrics, activity] = await Promise.all([
      getDashboardMetrics(organizationId, period),
      getRecentActivity(organizationId, 8),
    ]);

    const payload: DashboardDTO = {
      greetingName: auth.user.firstName ?? auth.user.email.split('@')[0] ?? '',
      period,
      revenueWonCents: metrics.revenueWonCents,
      revenuePotentialCents: metrics.revenuePotentialCents,
      quotesSent: metrics.quotesSent,
      quotesAccepted: metrics.quotesAccepted,
      acceptanceRate: metrics.acceptanceRate,
      averageQuoteCents: metrics.averageQuoteCents,
      pendingQuotes: metrics.pendingQuotes,
      newLeads: metrics.newLeads,
      toRecover: {
        totalCents: metrics.toRecover.totalCents,
        quoteCount: metrics.toRecover.quoteCount,
        customerCount: metrics.toRecover.customerCount,
        quotes: metrics.toRecover.quotes.map((quote) => ({
          id: quote.id,
          number: quote.number,
          title: quote.title,
          totalCents: quote.totalCents,
          status: quote.status,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          daysWaiting: quote.daysWaiting,
          viewCount: quote.viewCount,
          lastFollowUpAt: quote.lastFollowUpAt,
          suggestion: quote.suggestion,
        })),
      },
      recentActivity: activity.map((event) => ({
        id: event.id,
        type: event.type,
        quoteId: event.quoteId,
        quoteNumber: event.quoteNumber,
        quoteTitle: event.quoteTitle,
        totalCents: event.totalCents,
        createdAt: event.createdAt,
      })),
    };

    return ok(payload);
  });
}
