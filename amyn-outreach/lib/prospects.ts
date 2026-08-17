import { prisma } from "@/lib/db";
import { PROSPECT_STATUSES, type ProspectStatus } from "@/lib/constants";

export type StatusCounts = Record<ProspectStatus, number> & { TOTAL: number };

export async function getStatusCounts(): Promise<StatusCounts> {
  const [grouped, total] = await Promise.all([
    prisma.prospect.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.prospect.count(),
  ]);
  const counts = Object.fromEntries(PROSPECT_STATUSES.map((s) => [s, 0])) as Record<ProspectStatus, number>;
  for (const row of grouped) {
    if (row.status in counts) counts[row.status as ProspectStatus] = row._count._all;
  }
  return { ...counts, TOTAL: total };
}

export type ProspectListItem = Awaited<ReturnType<typeof listProspects>>[number];

export async function listProspects(filterStatus?: string, limit = 200) {
  const where =
    filterStatus && (PROSPECT_STATUSES as readonly string[]).includes(filterStatus)
      ? { status: filterStatus }
      : {};

  const rows = await prisma.prospect.findMany({
    where,
    orderBy: [{ overallScore: "desc" }, { updatedAt: "desc" }],
    take: limit,
    include: {
      primaryContact: { select: { email: true, isGeneric: true, discoveryMethod: true } },
      issues: { select: { id: true, title: true, severity: true, type: true } },
      _count: { select: { issues: true, emailDrafts: true, sendLogs: true, replies: true } },
    },
  });

  const rank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return rows.map((p) => ({
    ...p,
    topIssue: [...p.issues].sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3))[0] ?? null,
  }));
}

export async function getProspect(id: string) {
  return prisma.prospect.findUnique({
    where: { id },
    include: {
      primaryContact: true,
      contacts: { orderBy: { discoveredAt: "asc" } },
      issues: { orderBy: { severity: "asc" } },
      sources: { orderBy: { collectedAt: "asc" } },
      emailDrafts: { orderBy: { generatedAt: "desc" } },
      sendLogs: { orderBy: { createdAt: "desc" } },
      replies: { orderBy: { receivedAt: "desc" } },
      statusEvents: { orderBy: { createdAt: "desc" } },
      auditRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      auditChecks: { orderBy: { checkedAt: "asc" } },
    },
  });
}
