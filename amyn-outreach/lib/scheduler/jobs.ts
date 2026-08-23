// ---------------------------------------------------------------------------
// LES JOBS DE L'OPÉRATEUR
//
// Chacun s'appuie sur les modules existants — il n'y a aucune logique métier
// dupliquée ici. Un job orchestre, il ne réimplémente pas.
//
// AUCUN de ces jobs n'envoie d'email. La préparation d'une relance s'arrête à
// « prête, en attente d'approbation ». L'envoi reste une action séparée,
// soumise à DRY_RUN, à la conformité et à votre validation.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getPolicy, checkSendWindow, remainingToday } from "@/lib/policy";
import { decideOnReply } from "@/lib/operator/decide";
import { composeFollowUp } from "@/lib/email/replies";
import { syncReplies } from "@/lib/replies/sync";
import { imapStatus } from "@/lib/imap/config";
import { runJob, type JobResult } from "./index";

// --- 1. LECTURE DE LA BOÎTE -------------------------------------------------

export async function jobSyncInbox(): Promise<JobResult> {
  return runJob("sync-inbox", async () => {
    const status = imapStatus();
    if (!status.configured) {
      return {
        summary: `Boîte non configurée (manquant : ${status.missing.join(", ")}). Rien à lire.`,
        itemsSeen: 0, itemsChanged: 0,
      };
    }

    const { ImapSource } = await import("@/lib/imap/client");
    const rapport = await syncReplies(new ImapSource());

    if (rapport.error) {
      return {
        summary: `Lecture impossible : ${rapport.error}`,
        itemsSeen: 0, itemsChanged: 0, details: { error: rapport.error },
      };
    }

    return {
      summary: `${rapport.fetched} message(s) examiné(s), ${rapport.stored} enregistré(s), ${rapport.duplicates} doublon(s) ignoré(s).`,
      itemsSeen: rapport.fetched,
      itemsChanged: rapport.stored,
      details: {
        stored: rapport.stored, duplicates: rapport.duplicates,
        optOuts: rapport.optOuts, needsHuman: rapport.needsHuman, unmatched: rapport.unmatched,
      },
    };
  });
}

// --- 2. DÉCISION SUR LES RÉPONSES -------------------------------------------

export async function jobDecideReplies(): Promise<JobResult> {
  return runJob("decide-replies", async () => {
    const policy = await getPolicy();

    // Seules les réponses sans décision sont traitées : relancer le job ne
    // rejoue donc rien de déjà décidé.
    const aTraiter = await prisma.reply.findMany({
      where: { decisionAction: null },
      orderBy: { receivedAt: "asc" },
      take: 200,
      select: { id: true },
    });

    const parAction: Record<string, number> = {};
    for (const r of aTraiter) {
      const d = await decideOnReply(r.id, { policy });
      parAction[d.action] = (parAction[d.action] ?? 0) + 1;
    }

    return {
      summary:
        aTraiter.length === 0
          ? "Aucune réponse en attente de décision."
          : `${aTraiter.length} réponse(s) traitée(s) : ${Object.entries(parAction).map(([a, n]) => `${a} ${n}`).join(", ")}.`,
      itemsSeen: aTraiter.length,
      itemsChanged: aTraiter.length,
      details: parAction,
    };
  });
}

// --- 3. RELANCES ARRIVÉES À ÉCHÉANCE ----------------------------------------

/**
 * Prépare les relances dues.
 *
 * IDEMPOTENCE À DEUX NIVEAUX :
 *   • le verrou du job est calé sur la JOURNÉE, pas sur la minute : deux
 *     exécutions le même jour ne préparent pas deux relances ;
 *   • chaque membre est verrouillé par son `sequenceStep` : une relance déjà
 *     préparée pour l'étape N n'est pas repréparée.
 */
export async function jobDueFollowUps(options: { now?: Date } = {}): Promise<JobResult> {
  const now = options.now ?? new Date();
  const jour = now.toISOString().slice(0, 10);

  return runJob(
    "due-followups",
    async () => {
      const policy = await getPolicy();
      const fenetre = checkSendWindow(policy, now);
      const quota = await remainingToday(policy);

      const { findFollowUpCandidates } = await import("@/lib/campaign/followup");
      const { candidates, skipped } = await findFollowUpCandidates();

      const notes: string[] = [];
      if (!fenetre.open) notes.push(fenetre.reason);
      if (quota.remaining === 0) {
        notes.push(`Plafond quotidien atteint (${quota.used}/${policy.dailyLimit}).`);
      }

      let prepared = 0;
      const bloques: Array<{ nom: string; raison: string }> = [];

      for (const c of candidates) {
        if (c.nextStep > policy.maxFollowUps) {
          bloques.push({ nom: c.prospectName, raison: `Limite de ${policy.maxFollowUps} relance(s) atteinte.` });
          continue;
        }

        // Le délai dépend de l'étape : première relance vs suivantes.
        const delaiRequis =
          c.nextStep <= 1 ? policy.followUpDelayDays : policy.followUpIntervalDays;
        if (c.daysSince < delaiRequis) {
          bloques.push({
            nom: c.prospectName,
            raison: `Délai non écoulé : ${c.daysSince.toFixed(1)} j sur ${delaiRequis} requis.`,
          });
          continue;
        }

        // Verrou d'étape : une relance déjà préparée n'est pas repréparée.
        const dejaPrete = await prisma.emailDraft.findFirst({
          where: { prospectId: c.prospectId, sequenceStep: c.nextStep, isActive: true },
        });
        if (dejaPrete) {
          bloques.push({ nom: c.prospectName, raison: `Relance ${c.nextStep} déjà préparée.` });
          continue;
        }

        const compose = await composeFollowUp(c.prospectId, c.nextStep);
        if (!compose.verification.passed) {
          bloques.push({
            nom: c.prospectName,
            raison: `Relance refusée par la vérification : ${compose.verification.problems.join(" | ")}`,
          });
          continue;
        }

        await prisma.emailDraft.updateMany({
          where: { prospectId: c.prospectId, isActive: true },
          data: { isActive: false },
        });
        await prisma.emailDraft.create({
          data: {
            prospectId: c.prospectId,
            campaignId: c.campaignId,
            kind: c.nextStep === 1 ? "FOLLOWUP_1" : "FOLLOWUP_2",
            sequenceStep: c.nextStep,
            subject: compose.subject,
            body: compose.body,
            citedIssueIds: "[]",
            generator: "template",
            verificationPassed: true,
            isActive: true,
            // JAMAIS pré-approuvé : la relance attend votre validation.
            approvedAt: null,
          },
        });
        await prisma.campaignMember.updateMany({
          where: { campaignId: c.campaignId, prospectId: c.prospectId },
          data: { status: "READY", sequenceStep: c.nextStep, nextSendAt: fenetre.nextOpening ?? now },
        });
        prepared += 1;
      }

      const resume =
        `${prepared} relance(s) préparée(s), en attente d'approbation. ` +
        `${bloques.length + skipped.length} prospect(s) écarté(s).` +
        (notes.length > 0 ? ` ${notes.join(" ")}` : "");

      await logActivity({
        actor: "AGENT", module: "CAMPAIGN", action: "campaign.followup_due",
        summary: resume,
        details: { prepared, bloques: bloques.slice(0, 20), skipped: skipped.slice(0, 20), notes },
      });

      return {
        summary: resume,
        itemsSeen: candidates.length + skipped.length,
        itemsChanged: prepared,
        details: { prepared, bloques, skipped, fenetre: fenetre.reason, quota },
      };
    },
    // Verrou journalier : une seule préparation de relances par jour.
    { lockKey: `due-followups:${jour}` },
  );
}

// --- 4. MAINTENANCE ---------------------------------------------------------

export async function jobMaintenance(): Promise<JobResult> {
  return runJob("maintenance", async () => {
    const anomalies: string[] = [];
    let corriges = 0;

    // a) Un prospect en opposition dont un brouillon reste actif : incohérence
    //    dangereuse. On désactive le brouillon.
    const optouts = await prisma.prospect.findMany({
      where: { status: "OPTOUT", emailDrafts: { some: { isActive: true } } },
      select: { id: true, name: true },
    });
    for (const p of optouts) {
      await prisma.emailDraft.updateMany({
        where: { prospectId: p.id, isActive: true },
        data: { isActive: false },
      });
      anomalies.push(`${p.name} : brouillon actif malgré une opposition — désactivé.`);
      corriges += 1;
    }

    // b) Un membre de campagne encore actif alors que le prospect s'est opposé.
    const membres = await prisma.campaignMember.findMany({
      where: {
        status: { in: ["PENDING", "READY", "APPROVED"] },
        prospect: { status: { in: ["OPTOUT", "BLOCKED"] } },
      },
      include: { prospect: { select: { name: true, status: true } } },
    });
    for (const m of membres) {
      await prisma.campaignMember.updateMany({
        where: { id: m.id },
        data: { status: "SKIPPED", blockedReason: `Prospect ${m.prospect.status} : retiré de la campagne.`, nextSendAt: null },
      });
      anomalies.push(`${m.prospect.name} : retiré d'une campagne (${m.prospect.status}).`);
      corriges += 1;
    }

    // c) Réponses sans décision depuis plus d'une heure : le job de décision
    //    n'a peut-être pas tourné.
    const enRetard = await prisma.reply.count({
      where: { decisionAction: null, receivedAt: { lt: new Date(Date.now() - 3600_000) } },
    });
    if (enRetard > 0) {
      anomalies.push(`${enRetard} réponse(s) sans décision depuis plus d'une heure.`);
    }

    const resume =
      corriges === 0 && anomalies.length === 0
        ? "Aucune incohérence détectée."
        : `${corriges} incohérence(s) corrigée(s). ${anomalies.length} constat(s).`;

    if (anomalies.length > 0) {
      await logActivity({
        actor: "SYSTEM", module: "SCHEDULER", action: "job.maintenance",
        summary: resume, details: { anomalies }, level: corriges > 0 ? "WARN" : "INFO",
      });
    }

    return { summary: resume, itemsSeen: anomalies.length, itemsChanged: corriges, details: { anomalies } };
  });
}

// --- ENCHAÎNEMENT COMPLET ---------------------------------------------------

/** Un tour complet de l'opérateur. Aucun envoi. */
export async function runAllJobs(): Promise<JobResult[]> {
  return [
    await jobSyncInbox(),
    await jobDecideReplies(),
    await jobDueFollowUps(),
    await jobMaintenance(),
  ];
}
