import { prisma } from "@/lib/db";
import { DASHBOARD_STATUSES, PROSPECT_STATUSES, type ProspectStatus } from "@/lib/constants";

export type StatusCounts = Record<ProspectStatus, number> & { TOTAL: number };

/** Compteurs du dashboard, en une seule requête groupée. */
export async function getStatusCounts(): Promise<StatusCounts> {
  const [grouped, total] = await Promise.all([
    prisma.prospect.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.prospect.count(),
  ]);

  const counts = Object.fromEntries(
    PROSPECT_STATUSES.map((s) => [s, 0]),
  ) as Record<ProspectStatus, number>;

  for (const row of grouped) {
    if (row.status in counts) {
      counts[row.status as ProspectStatus] = row._count._all;
    }
  }

  return { ...counts, TOTAL: total };
}

export type ProspectListItem = Awaited<ReturnType<typeof listProspects>>[number];

/** Liste du tableau principal, avec le problème le plus grave de chaque fiche. */
export async function listProspects(filterStatus?: string) {
  const where =
    filterStatus && (PROSPECT_STATUSES as readonly string[]).includes(filterStatus)
      ? { status: filterStatus }
      : {};

  const rows = await prisma.prospect.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      issues: {
        orderBy: [{ severity: "asc" }, { detectedAt: "asc" }],
        select: { id: true, title: true, severity: true, type: true },
      },
      _count: { select: { issues: true, emailDrafts: true, sendLogs: true } },
    },
  });

  const severityRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return rows.map((p) => {
    const sorted = [...p.issues].sort(
      (a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3),
    );
    return { ...p, topIssue: sorted[0] ?? null };
  });
}

/** Fiche complète d'un prospect. */
export async function getProspect(id: string) {
  return prisma.prospect.findUnique({
    where: { id },
    include: {
      issues: { orderBy: { detectedAt: "asc" } },
      sources: { orderBy: { collectedAt: "asc" } },
      emailDrafts: { orderBy: { generatedAt: "desc" } },
      sendLogs: { orderBy: { createdAt: "desc" } },
      statusEvents: { orderBy: { createdAt: "desc" } },
    },
  });
}

/** Chiffres secondaires affichés sous les compteurs. */
export async function getPipelineStats() {
  const [demoCount, withEmail, issueCount, draftCount, sendCount, suppressed] =
    await Promise.all([
      prisma.prospect.count({ where: { isDemo: true } }),
      prisma.prospect.count({ where: { NOT: { email: null } } }),
      prisma.issue.count(),
      prisma.emailDraft.count(),
      prisma.sendLog.count(),
      prisma.suppression.count(),
    ]);

  return { demoCount, withEmail, issueCount, draftCount, sendCount, suppressed };
}

export { DASHBOARD_STATUSES };
