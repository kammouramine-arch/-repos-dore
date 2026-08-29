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

// --- 4. BALAYAGE NATIONAL ---------------------------------------------------

/**
 * Avance le balayage territorial depuis les points de reprise.
 *
 * VOLONTAIREMENT BORNÉ. Un tour traite quelques territoires, quelques pages
 * chacun, puis rend la main. Le worker progresse donc par petits pas
 * réguliers plutôt que par longues campagnes fragiles : chaque pas est
 * enregistré, et une coupure ne coûte au pire qu'une page.
 *
 * CE JOB N'ENVOIE RIEN. Il découvre des entreprises et les enregistre au
 * statut FOUND. Qualification, rédaction, approbation et envoi restent en
 * aval, sur leur chemin habituel et avec tous leurs contrôles.
 */
export async function jobSweepTerritories(
  options: { maxTerritories?: number; maxPages?: number } = {},
): Promise<JobResult> {
  return runJob("sweep-territories", async () => {
    const { sweepBatch } = await import("@/lib/territory/sweep");
    const { territoryProgress } = await import("@/lib/territory");

    const { results, summary } = await sweepBatch({
      maxTerritories: options.maxTerritories ?? 3,
      maxPages: options.maxPages ?? 4,
    });

    const progression = await territoryProgress();

    return {
      summary:
        summary +
        (progression.total > 0
          ? ` Avancement : ${progression.termines}/${progression.total} territoire(s).`
          : ""),
      itemsSeen: results.reduce((n, r) => n + r.discovered, 0),
      itemsChanged: results.reduce((n, r) => n + r.created, 0),
      details: {
        territoires: results.map((r) => ({
          label: r.label,
          secteur: r.sectorLabel,
          statut: r.status,
          pages: r.pages,
          nouvelles: r.created,
          doublons: r.duplicates,
          reprise: r.nextPage,
          erreur: r.error,
        })),
        progression,
      },
    };
  });
}

// --- 5. MAINTENANCE ---------------------------------------------------------

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

// ---------------------------------------------------------------------------
// LA CHAÎNE D'ENRICHISSEMENT
//
// Découvrir une entreprise ne sert à rien tant que rien ne la transforme en
// prospect contactable. Ces cinq jobs sont ce chaînon manquant : ils font
// avancer les prospects d'un état au suivant, par petits lots, à chaque tour
// du worker.
//
//   FOUND → site prouvé → audité → email trouvé → qualifié → email rédigé
//
// IDEMPOTENCE PAR L'ÉTAT. Chaque job sélectionne les prospects qui n'ont PAS
// encore franchi son étape. Le relancer ne refait donc rien : il n'y a plus
// personne à traiter. Le verrou de job protège en plus contre deux workers
// simultanés.
//
// AUCUN N'ENVOIE. Le dernier s'arrête à « rédigé, en attente d'approbation ».
// ---------------------------------------------------------------------------

/** Taille des lots. Un tour de worker fait un peu, souvent, plutôt que tout, une fois. */
export const LOTS = {
  sites: 10,
  audits: 10,
  emails: 10,
  qualifications: 50,
  redactions: 10,
} as const;

/**
 * Prospects réels, jamais les fiches de démonstration.
 *
 * Les statuts exclus le sont pour des raisons différentes : OPTOUT et BLOCKED
 * ne doivent plus rien recevoir, WON et LOST ont quitté le pipeline. Enrichir
 * l'un d'eux serait au mieux inutile, au pire une sollicitation interdite.
 */
const STATUTS_HORS_PIPELINE = ["OPTOUT", "BLOCKED", "WON", "LOST"];
const REELS = { isDemo: false, status: { notIn: STATUTS_HORS_PIPELINE } };

// --- 5. TROUVER LE SITE OFFICIEL --------------------------------------------

export async function jobEnrichSites(options: { limit?: number } = {}): Promise<JobResult> {
  return runJob("enrich-sites", async () => {
    const { discoverWebsite } = await import("@/lib/site/discover");

    const cibles = await prisma.prospect.findMany({
      where: { ...REELS, websiteStatus: "UNKNOWN" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: options.limit ?? LOTS.sites,
    });

    const parStatut: Record<string, number> = {};
    for (const p of cibles) {
      try {
        const r = await discoverWebsite(p.id);
        parStatut[r.statut] = (parStatut[r.statut] ?? 0) + 1;
      } catch (e) {
        // UN PROSPECT EN ECHEC NE DOIT PAS REVENIR A CHAQUE TOUR. Le job
        // prend les plus anciens d'abord : laisser un prospect qui plante en
        // tete de file le ferait rejouer indefiniment, et rien derriere lui
        // n'avancerait jamais. On enregistre donc l'echec, avec sa raison,
        // pour qu'il sorte de la file — et reste consultable.
        parStatut.ERREUR = (parStatut.ERREUR ?? 0) + 1;
        await prisma.prospect.update({
          where: { id: p.id },
          data: {
            websiteStatus: "ERROR",
            websiteCheckedAt: new Date(),
            websiteEvidence: JSON.stringify({
              raison: `Recherche interrompue : ${e instanceof Error ? e.message : String(e)}`,
              preuves: [], candidats: [],
            }),
          },
        });
      }
    }

    const confirmes = parStatut.CONFIRMED ?? 0;
    return {
      summary:
        cibles.length === 0
          ? "Aucun prospect en attente de recherche de site."
          : `${cibles.length} prospect(s) examiné(s) : ${confirmes} site(s) prouvé(s), ` +
            `${(parStatut.NOT_FOUND ?? 0)} sans site, ${(parStatut.UNCONFIRMED ?? 0)} non prouvé(s).`,
      itemsSeen: cibles.length,
      itemsChanged: confirmes,
      details: parStatut,
    };
  });
}

// --- 6. AUDITER LES SITES ---------------------------------------------------

export async function jobAuditSites(options: { limit?: number } = {}): Promise<JobResult> {
  return runJob("audit-sites", async () => {
    const { auditProspect } = await import("@/lib/audit/persist");

    const cibles = await prisma.prospect.findMany({
      where: { ...REELS, website: { not: null }, auditStatus: "PENDING" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: options.limit ?? LOTS.audits,
    });

    let reussis = 0;
    let echoues = 0;
    for (const p of cibles) {
      try {
        await auditProspect(p.id);
        reussis += 1;
      } catch {
        echoues += 1;
      }
    }

    return {
      summary:
        cibles.length === 0
          ? "Aucun site en attente d'audit."
          : `${reussis} audit(s) effectué(s)${echoues > 0 ? `, ${echoues} en échec` : ""}.`,
      itemsSeen: cibles.length,
      itemsChanged: reussis,
      details: { reussis, echoues },
    };
  });
}

// --- 7. CHERCHER LES EMAILS PUBLIÉS -----------------------------------------

export async function jobFindEmails(options: { limit?: number } = {}): Promise<JobResult> {
  return runJob("find-emails", async () => {
    const { discoverContacts } = await import("@/lib/contact/discover");

    // Uniquement les prospects dont le site a été audité : sans site
    // accessible, il n'y a aucune page où lire une adresse. Et aucune adresse
    // n'est jamais devinée à partir du domaine.
    const cibles = await prisma.prospect.findMany({
      where: {
        ...REELS,
        website: { not: null },
        auditStatus: { in: ["COMPLETE", "INCOMPLETE"] },
        contacts: { none: {} },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: options.limit ?? LOTS.emails,
    });

    let trouves = 0;
    let sansEmail = 0;
    for (const p of cibles) {
      try {
        const r = await discoverContacts(p.id);
        if (!r.blocked && r.saved > 0) trouves += 1;
        else sansEmail += 1;
      } catch {
        sansEmail += 1;
      }
    }

    return {
      summary:
        cibles.length === 0
          ? "Aucun site audité en attente de recherche d'email."
          : `${trouves} email(s) public(s) trouvé(s) sur ${cibles.length} site(s). ` +
            `${sansEmail} sans adresse publiée — aucune n'est devinée.`,
      itemsSeen: cibles.length,
      itemsChanged: trouves,
      details: { trouves, sansEmail },
    };
  });
}

// --- 8. SCORER PUIS QUALIFIER -----------------------------------------------

export async function jobQualifyProspects(options: { limit?: number } = {}): Promise<JobResult> {
  return runJob("qualify-prospects", async () => {
    const { scoreProspect } = await import("@/lib/scoring");
    const { qualifyProspect } = await import("@/lib/qualification");
    const policy = await getPolicy();

    // Un prospect se juge une fois son enrichissement tenté : site cherché ET
    // audit tranché. Le juger plus tôt reviendrait à lui reprocher de ne pas
    // avoir d'email alors qu'on ne l'a pas encore cherché — l'impasse
    // rencontrée sur la première mission.
    const cibles = await prisma.prospect.findMany({
      where: {
        ...REELS,
        qualification: "PENDING",
        websiteStatus: { not: "UNKNOWN" },
        OR: [
          { auditStatus: { not: "PENDING" } },
          { websiteStatus: { in: ["NOT_FOUND", "UNCONFIRMED"] } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: options.limit ?? LOTS.qualifications,
    });

    const verdicts: Record<string, number> = {};
    for (const p of cibles) {
      try {
        await scoreProspect(p.id);
      } catch {
        // Score impossible : la qualification tranchera sans lui.
      }
      try {
        const q = await qualifyProspect(p.id, { policy, stage: "FINAL" });
        verdicts[q.verdict] = (verdicts[q.verdict] ?? 0) + 1;
      } catch {
        verdicts.ERREUR = (verdicts.ERREUR ?? 0) + 1;
      }
    }

    return {
      summary:
        cibles.length === 0
          ? "Aucun prospect enrichi en attente de qualification."
          : `${cibles.length} prospect(s) jugé(s) : ` +
            Object.entries(verdicts).map(([v, n]) => `${n} ${v}`).join(", ") + ".",
      itemsSeen: cibles.length,
      itemsChanged: verdicts.QUALIFIED ?? 0,
      details: verdicts,
    };
  });
}

// --- 9. RÉDIGER LES EMAILS --------------------------------------------------

export async function jobPrepareEmails(options: { limit?: number } = {}): Promise<JobResult> {
  return runJob("prepare-emails", async () => {
    const { generateEmail } = await import("@/lib/email/generate");

    const cibles = await prisma.prospect.findMany({
      where: {
        ...REELS,
        qualification: "QUALIFIED",
        primaryContactId: { not: null },
        emailDrafts: { none: { isActive: true } },
      },
      select: { id: true, name: true },
      orderBy: { overallScore: "desc" },
      take: options.limit ?? LOTS.redactions,
    });

    let rediges = 0;
    const refuses: string[] = [];

    for (const p of cibles) {
      try {
        const email = await generateEmail(p.id);
        if (email.verification.passed) rediges += 1;
        else refuses.push(`${p.name} : ${email.verification.problems[0]}`);
      } catch (e) {
        // Sans constat prouvé, aucun email ne peut être écrit. Ce n'est pas
        // une erreur du job : c'est la règle anti-invention qui s'applique.
        refuses.push(`${p.name} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      summary:
        cibles.length === 0
          ? "Aucun prospect qualifié en attente de rédaction."
          : `${rediges} email(s) rédigé(s) et vérifié(s), en attente d'approbation` +
            (refuses.length > 0 ? `, ${refuses.length} refusé(s) faute de preuves.` : "."),
      itemsSeen: cibles.length,
      itemsChanged: rediges,
      details: { rediges, refuses: refuses.slice(0, 10) },
    };
  });
}

// --- ENCHAÎNEMENT COMPLET ---------------------------------------------------

/** Un tour complet de l'opérateur. Aucun envoi. */
export async function runAllJobs(
  options: {
    sweep?: boolean;
    maxTerritories?: number;
    maxPages?: number;
    /** Sauter la chaîne d'enrichissement (elle sort sur le réseau). */
    enrich?: boolean;
  } = {},
): Promise<JobResult[]> {
  const resultats = [
    await jobSyncInbox(),
    await jobDecideReplies(),
    await jobDueFollowUps(),
  ];

  // Le balayage national n'est lancé que s'il a quelque chose à faire : sans
  // territoire planifié, il ne sert à rien de poser un verrou à chaque tour.
  if (options.sweep !== false) {
    const enAttente = await prisma.territory.count({
      where: { status: { in: ["PENDING", "FAILED"] } },
    });
    if (enAttente > 0) {
      resultats.push(
        await jobSweepTerritories({
          maxTerritories: options.maxTerritories,
          maxPages: options.maxPages,
        }),
      );
    }
  }

  // La chaîne d'enrichissement, dans l'ordre du pipeline. Chaque job ne
  // traite que ce que le précédent a rendu traitable, si bien qu'un tour de
  // worker fait avancer les prospects d'un cran — et qu'une centaine de tours
  // les mène du registre à l'email prêt, sans intervention.
  if (options.enrich !== false) {
    resultats.push(await jobEnrichSites());
    resultats.push(await jobAuditSites());
    resultats.push(await jobFindEmails());
    resultats.push(await jobQualifyProspects());
    resultats.push(await jobPrepareEmails());
  }

  resultats.push(await jobMaintenance());
  return resultats;
}

