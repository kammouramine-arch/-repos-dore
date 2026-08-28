// ---------------------------------------------------------------------------
// ORCHESTRATEUR — une mission commerciale de bout en bout
//
//   « Prospecte les coiffeurs indépendants de Lille »
//
//        RECHERCHE → QUALIFICATION → AUDIT → CONTACT → SCORE →
//        QUALIFICATION (2e passe) → RÉDACTION → CAMPAGNE → ATTENTE
//
// Ce module ne réimplémente RIEN : il enchaîne les modules existants et note,
// à chaque étape, ce qui a été fait et pourquoi. La mission s'arrête toujours
// AVANT l'envoi : préparer n'est pas envoyer.
//
// La qualification tourne deux fois, volontairement : une première passe écarte
// tout de suite ce qui est bloqué (opposition, déjà contacté) pour ne pas
// auditer inutilement ; la seconde tranche une fois les preuves réunies.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getPolicy } from "@/lib/policy";
import { qualifyProspect } from "@/lib/qualification";
import { searchAndImport } from "@/lib/research";
import { auditProspect } from "@/lib/audit/persist";
import { discoverContacts } from "@/lib/contact/discover";
import { scoreProspect } from "@/lib/scoring";
import { generateEmail } from "@/lib/email/generate";
import { createCampaign, addProspectsToCampaign, prepareCampaign } from "@/lib/campaign";

export type MissionBrief = {
  /** Instruction d'origine, conservée telle quelle. */
  brief: string;
  city?: string;
  sectors?: string[];
  limit?: number;
  /** Sauter la recherche et travailler sur des prospects déjà en base. */
  prospectIds?: string[];
  /** Ne pas créer de campagne : s'arrêter après la rédaction. */
  skipCampaign?: boolean;
};

export type MissionResult = {
  missionId: string;
  status: "DONE" | "PARTIAL" | "FAILED" | "WAITING_APPROVAL";
  summary: string;
  found: number;
  qualified: number;
  rejected: number;
  needsHuman: number;
  emailsPrepared: number;
  /** Motifs d'exclusion, regroupés : « aucun email fiable » → 14, etc. */
  rejectionReasons: Record<string, number>;
  campaignId?: string;
  campaignSlug?: string;
  needsFromYou: string[];
  steps: Array<{ stage: string; description: string; status: string; detail: string }>;
};

type Step = { stage: string; description: string; rationale: string; status: string; detail: string; result?: unknown };

export async function runMission(input: MissionBrief): Promise<MissionResult> {
  const policy = await getPolicy();
  const steps: Step[] = [];
  const needsFromYou: string[] = [];

  const mission = await prisma.mission.create({
    data: {
      brief: input.brief,
      criteria: JSON.stringify({
        city: input.city, sectors: input.sectors, limit: input.limit,
        prospectIds: input.prospectIds?.length ?? 0,
      }),
      status: "RUNNING",
    },
  });

  const note = (s: Step) => { steps.push(s); return s; };

  try {
    // === 1. RECHERCHE ====================================================
    let prospectIds: string[] = input.prospectIds ?? [];

    if (prospectIds.length === 0) {
      if (!input.city || !input.sectors || input.sectors.length === 0) {
        note({
          stage: "RESEARCH", description: "Rechercher des entreprises",
          rationale: "Une mission de prospection a besoin d'une cible.",
          status: "FAILED",
          detail: "Ville ou secteur absent de l'instruction : l'agent ne choisit pas la cible à votre place.",
        });
        needsFromYou.push(
          'Précisez la ville et le secteur. Exemple : « Prospecte les coiffeurs à Lille ».',
        );
        return await close(mission.id, "FAILED", steps, needsFromYou, {
          found: 0, qualified: 0, rejected: 0, needsHuman: 0, emailsPrepared: 0,
          rejectionReasons: {},
        });
      }

      const recherche = await searchAndImport(
        { city: input.city, sectors: input.sectors, limit: input.limit ?? 20 },
        {},
      );
      prospectIds = recherche.prospects.map((p) => p.id);

      note({
        stage: "RESEARCH",
        description: `Rechercher ${input.limit ?? 20} entreprise(s) — ${input.sectors.join(", ")} à ${input.city}`,
        rationale: "Constituer une liste d'entreprises réelles, chacune avec sa source.",
        status: prospectIds.length > 0 ? "DONE" : "SKIPPED",
        detail: `${recherche.created} nouvelle(s), ${recherche.duplicates} déjà connue(s), source ${recherche.sourceId}.`,
        result: { created: recherche.created, duplicates: recherche.duplicates, notes: recherche.notes },
      });

      if (prospectIds.length === 0) {
        needsFromYou.push(
          `Aucune entreprise nouvelle trouvée pour « ${input.sectors.join(", ")} à ${input.city} ». Élargissez la zone ou changez de secteur.`,
        );
        return await close(mission.id, "PARTIAL", steps, needsFromYou, {
          found: 0, qualified: 0, rejected: recherche.duplicates, needsHuman: 0, emailsPrepared: 0,
          rejectionReasons: { "Entreprise déjà connue en base": recherche.duplicates },
        });
      }
    } else {
      note({
        stage: "RESEARCH", description: "Travailler sur des prospects déjà en base",
        rationale: "La mission porte sur une liste fournie.",
        status: "SKIPPED", detail: `${prospectIds.length} prospect(s) fourni(s).`,
      });
    }

    const found = prospectIds.length;

    // === 2. QUALIFICATION — 1re passe (stade PRE) ========================
    //
    // Ne juge QUE sur ce qui est vérifiable avant enrichissement : opposition,
    // délai de recontact, existence corroborée. Exiger un email ici éliminerait
    // tout le monde, puisque la recherche d'email n'a pas encore eu lieu.
    const bloques: Array<{ id: string; nom: string; raison: string }> = [];
    const retenus: string[] = [];

    for (const id of prospectIds) {
      const q = await qualifyProspect(id, { policy, stage: "PRE" });
      if (q.verdict === "NOT_QUALIFIED") {
        const bloque = await prisma.prospect.findUnique({ where: { id }, select: { name: true } });
        bloques.push({ id, nom: bloque?.name ?? id, raison: q.summary });
      } else {
        retenus.push(id);
      }
    }

    note({
      stage: "QUALIFY", description: "Écarter les prospects hors circuit",
      rationale:
        "Opposition, contact récent, existence non corroborée : inutile d'auditer. " +
        "L'email, l'opportunité et le score ne sont PAS jugés ici — ils n'existent pas encore.",
      status: "DONE",
      detail: `${retenus.length} retenu(s) pour enrichissement, ${bloques.length} écarté(s) d'emblée.`,
      result: { bloques: bloques.slice(0, 20) },
    });

    // === 3. AUDIT ========================================================
    let audites = 0;
    for (const id of retenus) {
      try {
        await auditProspect(id);
        audites += 1;
      } catch {
        // Un site injoignable n'est pas une erreur de mission : l'audit le
        // consigne et la qualification en tiendra compte.
      }
    }
    note({
      stage: "AUDIT", description: "Analyser la présence en ligne",
      rationale: "Sans constat prouvé, aucun email ne peut être écrit.",
      status: "DONE", detail: `${audites} audit(s) effectué(s) sur ${retenus.length}.`,
    });

    // === 4. CONTACT ======================================================
    let avecEmail = 0;
    for (const id of retenus) {
      try {
        const r = await discoverContacts(id);
        if (!r.blocked && r.saved > 0) avecEmail += 1;
      } catch { /* prospect bloqué : la raison est déjà enregistrée */ }
    }
    note({
      stage: "CONTACT", description: "Chercher les emails publiés par les entreprises",
      rationale: "Aucune adresse n'est devinée : sans email publié, le prospect reste bloqué.",
      status: "DONE",
      detail: `${avecEmail} email(s) trouvé(s) sur ${retenus.length} — les autres restent sans contact.`,
    });

    // === 5. SCORE ========================================================
    for (const id of retenus) {
      try { await scoreProspect(id); } catch { /* score impossible : neutre */ }
    }
    note({
      stage: "SCORE", description: "Calculer le score et recommander une offre",
      rationale: "Prioriser sans jamais prétendre connaître la santé financière de l'entreprise.",
      status: "DONE", detail: `${retenus.length} prospect(s) scoré(s).`,
    });

    // === 6. QUALIFICATION — passe finale =================================
    const qualifies: string[] = [];
    const rejetes: Array<{ id: string; nom: string; raison: string }> = [];
    const aVoir: string[] = [];

    for (const id of retenus) {
      // Stade FINAL : les 7 critères, avec exactement la même sévérité.
      const q = await qualifyProspect(id, { policy, stage: "FINAL" });
      if (q.verdict === "QUALIFIED") {
        qualifies.push(id);
      } else if (q.verdict === "NEEDS_HUMAN") {
        aVoir.push(id);
      } else {
        const p = await prisma.prospect.findUnique({ where: { id }, select: { name: true } });
        rejetes.push({ id, nom: p?.name ?? id, raison: q.summary });
      }
    }

    // Regroupe les motifs de rejet : « 14 sans email » est plus utile que
    // quatorze lignes identiques.
    const motifs = new Map<string, number>();
    for (const r of [...bloques, ...rejetes]) {
      const cle = r.raison.replace(/^Écarté\s*:\s*/i, "").split(" — ")[0].trim();
      motifs.set(cle, (motifs.get(cle) ?? 0) + 1);
    }

    note({
      stage: "QUALIFY", description: "Décider qui mérite d'être contacté",
      rationale: "Une opportunité ne se suppose pas : elle s'appuie sur les preuves réunies.",
      status: "DONE",
      detail:
        `${qualifies.length} qualifié(s), ${rejetes.length} écarté(s) après enrichissement, ` +
        `${aVoir.length} à trancher par vous.`,
      result: { rejetes: rejetes.slice(0, 20) },
    });

    if (aVoir.length > 0) {
      const noms = await prisma.prospect.findMany({
        where: { id: { in: aVoir.slice(0, 5) } }, select: { name: true },
      });
      needsFromYou.push(
        `${aVoir.length} prospect(s) ne peuvent pas être tranchés automatiquement ` +
        `(${noms.map((n) => n.name).join(", ")}${aVoir.length > 5 ? "…" : ""}) : ` +
        `informations insuffisantes. Ouvrez leur fiche pour décider.`,
      );
    }

    // === 7. RÉDACTION ====================================================
    let prepares = 0;
    const echecsRedaction: string[] = [];

    for (const id of qualifies) {
      try {
        const email = await generateEmail(id);
        if (email.verification.passed) prepares += 1;
        else echecsRedaction.push(`${id} : ${email.verification.problems[0]}`);
      } catch (e) {
        echecsRedaction.push(e instanceof Error ? e.message : String(e));
      }
    }

    note({
      stage: "DRAFT", description: "Rédiger un email par prospect qualifié",
      rationale: "Chaque email ne cite que les problèmes prouvés de CE prospect.",
      status: "DONE",
      detail: `${prepares} email(s) rédigé(s) et vérifié(s)${echecsRedaction.length > 0 ? `, ${echecsRedaction.length} refusé(s)` : ""}.`,
      result: { prepares, echecs: echecsRedaction.slice(0, 5) },
    });

    // === 8. CAMPAGNE =====================================================
    let campaignId: string | undefined;
    let campaignSlug: string | undefined;

    if (!input.skipCampaign && prepares > 0) {
      const campagne = await createCampaign({
        name: `${input.sectors?.join(", ") ?? "Prospection"} — ${input.city ?? "sélection"} — ${new Date().toLocaleDateString("fr-FR")}`,
        targetCriteria: { city: input.city, sectors: input.sectors },
      });
      campaignId = campagne.id;
      campaignSlug = campagne.slug;

      await addProspectsToCampaign(campaignId, qualifies);
      const prep = await prepareCampaign(campaignId);

      note({
        stage: "CAMPAIGN", description: "Regrouper les emails dans une campagne",
        rationale: "Une campagne permet de tout relire d'un coup avant d'approuver.",
        status: "WAITING_APPROVAL",
        detail: `${prep.prepared} email(s) prêt(s), ${prep.blocked} bloqué(s) par la conformité.`,
      });

      needsFromYou.push(
        `${prep.prepared} email(s) attendent votre relecture puis votre approbation : ` +
        `npm run amyn -- campaign approve ${campaignSlug}`,
      );
    } else if (prepares === 0) {
      note({
        stage: "CAMPAIGN", description: "Créer une campagne",
        rationale: "Sans email vérifié, il n'y a rien à envoyer.",
        status: "SKIPPED", detail: "Aucun email n'a passé la vérification.",
      });
    }

    const status: MissionResult["status"] =
      campaignId ? "WAITING_APPROVAL" : prepares > 0 ? "DONE" : "PARTIAL";

    // Tout prospect trouvé se retrouve dans EXACTEMENT une catégorie.
    // La somme doit égaler `found` — un test le vérifie.
    const rejectedTotal = bloques.length + rejetes.length;

    if (rejectedTotal > 0) {
      const detail = [...motifs.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([motif, n]) => `${n} × ${motif.toLowerCase()}`)
        .join(", ");
      needsFromYou.push(
        `${rejectedTotal} entreprise(s) écartée(s) sur ${found} : ${detail}. ` +
        `Détail complet : npm run amyn -- qualify --all`,
      );
    }

    return await close(mission.id, status, steps, needsFromYou, {
      found,
      qualified: qualifies.length,
      rejected: rejectedTotal,
      needsHuman: aVoir.length,
      emailsPrepared: prepares,
      campaignId, campaignSlug,
      rejectionReasons: Object.fromEntries(motifs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    note({
      stage: "MISSION", description: "Exécution", rationale: "",
      status: "FAILED", detail: message,
    });
    return await close(mission.id, "FAILED", steps, [`La mission s'est arrêtée : ${message}`], {
      found: 0, qualified: 0, rejected: 0, needsHuman: 0, emailsPrepared: 0,
      rejectionReasons: {},
    });
  }
}

async function close(
  missionId: string,
  status: MissionResult["status"],
  steps: Step[],
  needsFromYou: string[],
  counts: {
    found: number; qualified: number; rejected: number; needsHuman: number;
    emailsPrepared: number; campaignId?: string; campaignSlug?: string;
    rejectionReasons?: Record<string, number>;
  },
): Promise<MissionResult> {
  const summary =
    status === "FAILED"
      ? `Mission interrompue. ${steps[steps.length - 1]?.detail ?? ""}`
      : `${counts.found} trouvée(s) = ${counts.qualified} qualifiée(s) + ` +
        `${counts.rejected} écartée(s) + ${counts.needsHuman} à trancher. ` +
        `${counts.emailsPrepared} email(s) prêt(s), en attente d'approbation.`;

  await prisma.$transaction([
    prisma.mission.update({
      where: { id: missionId },
      data: {
        status, summary,
        needsHuman: JSON.stringify(needsFromYou),
        prospectsFound: counts.found,
        prospectsQualified: counts.qualified,
        prospectsRejected: counts.rejected,
        prospectsNeedsHuman: counts.needsHuman,
        emailsPrepared: counts.emailsPrepared,
        campaignId: counts.campaignId ?? null,
        finishedAt: new Date(),
      },
    }),
    ...steps.map((s, i) =>
      prisma.missionStep.create({
        data: {
          missionId, stage: s.stage, description: s.description,
          rationale: s.rationale, status: s.status,
          result: JSON.stringify({ detail: s.detail, ...(s.result ? { result: s.result } : {}) }),
          position: i,
        },
      }),
    ),
  ]);

  await logActivity({
    actor: "AGENT", module: "OPERATOR", action: "mission.run",
    entityType: "Mission", entityId: missionId,
    summary, details: { status, ...counts },
    level: status === "FAILED" ? "ERROR" : "INFO",
  });

  return {
    missionId, status, summary,
    found: counts.found, qualified: counts.qualified, rejected: counts.rejected,
    needsHuman: counts.needsHuman, emailsPrepared: counts.emailsPrepared,
    rejectionReasons: counts.rejectionReasons ?? {},
    campaignId: counts.campaignId, campaignSlug: counts.campaignSlug,
    needsFromYou,
    steps: steps.map((s) => ({ stage: s.stage, description: s.description, status: s.status, detail: s.detail })),
  };
}
