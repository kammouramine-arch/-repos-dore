// ---------------------------------------------------------------------------
// Enregistrement d'un audit en base.
//
// Regle : on ecrit TOUS les checks (y compris UNVERIFIED / NOT_FOUND), mais on
// ne cree une Issue que pour les constats qui prouvent un probleme.
// L'Issue pointe vers le check qui la demontre : la preuve est tracable.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { ISSUE_TYPES } from "@/lib/constants";
import { runAudit, ENGINE_VERSION } from "./engine";
import { USER_AGENT } from "./http";
import { logActivity } from "@/lib/activity";
import type { AuditReport, ProspectInput } from "./types";

export type PersistedAudit = {
  auditRunId: string;
  report: AuditReport;
  issuesCreated: number;
};

export async function auditProspect(prospectId: string): Promise<PersistedAudit> {
  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: { sources: { select: { label: true } } },
  });
  if (!prospect) throw new Error(`Prospect introuvable : ${prospectId}`);

  const input: ProspectInput = {
    id: prospect.id,
    name: prospect.name,
    sector: prospect.sector,
    city: prospect.city,
    website: prospect.website,
    googleBusinessUrl: prospect.googleBusinessUrl,
    googlePlaceId: prospect.googlePlaceId,
    instagramUrl: prospect.instagramUrl,
    phone: prospect.phone,
    email: null,
    sourceLabels: prospect.sources.map((s) => s.label),
  };

  const report = await runAudit(input);

  const run = await prisma.auditRun.create({
    data: {
      prospectId,
      status: report.status,
      note: report.note,
      engineVersion: ENGINE_VERSION,
      userAgent: USER_AGENT,
      pagesFetched: report.stats.pagesFetched,
      bytesFetched: report.stats.bytesFetched,
      requestsMade: report.stats.requestsMade,
      rulesRun: report.stats.rulesRun,
      verifiedCount: report.stats.verified,
      unverifiedCount: report.stats.unverified,
      notFoundCount: report.stats.notFound,
      problemCount: report.stats.problems,
      finishedAt: new Date(),
      durationMs: report.stats.durationMs,
    },
  });

  // On remplace le diagnostic precedent : un audit fait foi a sa date.
  await prisma.issue.deleteMany({ where: { prospectId } });

  let issuesCreated = 0;

  for (const check of report.checks) {
    const created = await prisma.auditCheck.create({
      data: {
        prospectId,
        auditRunId: run.id,
        ruleId: check.ruleId,
        ruleLabel: check.ruleLabel,
        category: check.category,
        verdict: check.verdict,
        confidence: check.confidence,
        isProblem: check.isProblem,
        issueType: check.issueType,
        severity: check.severity,
        observation: check.observation,
        method: check.method,
        targetUrl: check.evidence?.targetUrl,
        evidenceSnippet: check.evidence?.snippet,
        evidenceData: check.evidence?.data ? JSON.stringify(check.evidence.data) : null,
      },
    });

    if (check.isProblem && check.issueType && check.title) {
      await prisma.issue.create({
        data: {
          prospectId,
          type: check.issueType,
          severity: check.severity ?? "MEDIUM",
          title: check.title,
          summary: check.observation,
          evidenceUrl: check.evidence?.targetUrl,
          evidenceSnippet: check.evidence?.snippet,
          evidenceNote: check.method,
          detectionMethod: "AUTOMATED",
          confidence: check.confidence,
          ruleId: check.ruleId,
          auditCheckId: created.id,
        },
      });
      issuesCreated += 1;
    }
  }

  const shouldAdvance =
    ["FOUND", "RESEARCHED"].includes(prospect.status) && report.status !== "FAILED";

  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      auditStatus: report.status,
      auditNote: report.note,
      auditedAt: new Date(),
      ...(shouldAdvance ? { status: "AUDITED" } : {}),
    },
  });

  if (shouldAdvance) {
    await prisma.statusEvent.create({
      data: {
        prospectId,
        fromStatus: prospect.status,
        toStatus: "AUDITED",
        reason: `Audit ${report.status} : ${issuesCreated} problème(s) prouvé(s) sur ${report.stats.rulesRun} vérification(s).`,
        actor: "SYSTEM",
      },
    });
  }

  await logActivity({
    actor: "SYSTEM",
    module: "AUDIT",
    action: "audit.run",
    entityType: "Prospect",
    entityId: prospectId,
    summary: `Audit de ${prospect.name} : ${report.status}, ${issuesCreated} problème(s) prouvé(s), ${report.stats.rulesRun} vérification(s), ${report.stats.requestsMade} requête(s).`,
    details: { status: report.status, stats: report.stats, note: report.note },
  });

  return { auditRunId: run.id, report, issuesCreated };
}

export const KNOWN_ISSUE_TYPES = Object.keys(ISSUE_TYPES);
