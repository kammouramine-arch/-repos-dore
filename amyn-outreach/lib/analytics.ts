// ---------------------------------------------------------------------------
// ANALYTICS — l'etat reel du systeme, en chiffres verifiables.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { PROSPECT_STATUSES, OFFERS, type ProspectStatus } from "@/lib/constants";

export async function pipelineSnapshot() {
  const [
    grouped,
    total,
    withContact,
    issues,
    drafts,
    sends,
    realSends,
    replies,
    suppressions,
    clients,
    projects,
    care,
    payments,
    errors,
    blockedSends,
  ] = await Promise.all([
    prisma.prospect.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.prospect.count(),
    prisma.prospect.count({ where: { primaryContactId: { not: null } } }),
    prisma.issue.count(),
    prisma.emailDraft.count({ where: { isActive: true } }),
    prisma.sendLog.count(),
    prisma.sendLog.count({ where: { status: "SENT" } }),
    prisma.reply.groupBy({ by: ["classification"], _count: { _all: true } }),
    prisma.suppression.count(),
    prisma.client.findMany({ select: { offer: true, offerPrice: true, status: true } }),
    prisma.project.groupBy({ by: ["phase"], _count: { _all: true } }),
    prisma.careSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.payment.groupBy({ by: ["status"], _sum: { amount: true }, _count: { _all: true } }),
    prisma.activityLog.count({ where: { level: "ERROR" } }),
    prisma.sendLog.count({ where: { status: "BLOCKED" } }),
  ]);

  const byStatus = Object.fromEntries(PROSPECT_STATUSES.map((s) => [s, 0])) as Record<ProspectStatus, number>;
  for (const g of grouped) {
    if (g.status in byStatus) byStatus[g.status as ProspectStatus] = g._count._all;
  }

  const repliesByClass = Object.fromEntries(replies.map((r) => [r.classification, r._count._all]));

  const signedRevenue = clients.reduce((sum, c) => sum + c.offerPrice, 0);
  const recurringRevenue = care * OFFERS.CARE.price;
  const paid =
    payments.find((p) => p.status === "PAYMENT_RECEIVED")?._sum.amount ?? 0;
  const pending = payments.find((p) => p.status === "PAYMENT_PENDING")?._sum.amount ?? 0;

  return {
    prospects: { total, byStatus, withContact },
    audit: { issues },
    emails: { drafts, sends, realSends, blockedSends },
    replies: { total: replies.reduce((s, r) => s + r._count._all, 0), byClass: repliesByClass },
    compliance: { suppressions, errors },
    clients: {
      total: clients.length,
      byStatus: clients.reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      }, {}),
    },
    projects: Object.fromEntries(projects.map((p) => [p.phase, p._count._all])),
    care: { active: care, monthlyRevenue: recurringRevenue },
    revenue: { signed: signedRevenue, recurring: recurringRevenue, paid, pending },
  };
}
