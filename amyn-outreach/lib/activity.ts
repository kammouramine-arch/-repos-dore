// ---------------------------------------------------------------------------
// Journal d'audit global.
// Toute action importante laisse une trace : qui, quoi, pourquoi, resultat.
// Aucune action silencieuse.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";

export type ActivityInput = {
  actor: "SYSTEM" | "AGENT" | "HUMAN";
  module: string;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
  level?: "INFO" | "WARN" | "ERROR";
};

export async function logActivity(input: ActivityInput) {
  return prisma.activityLog.create({
    data: {
      actor: input.actor,
      module: input.module,
      action: input.action,
      summary: input.summary,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details === undefined ? null : JSON.stringify(input.details),
      level: input.level ?? "INFO",
    },
  });
}

export async function recentActivity(limit = 50) {
  return prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
