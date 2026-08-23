// ---------------------------------------------------------------------------
// CAMPAGNE PILOTE — le premier envoi réel, en petit
//
// Objectif : vérifier que le chemin RÉEL fonctionne de bout en bout, avec
// assez peu de prospects pour qu'une erreur reste sans conséquence.
//
//   prospect → email réel → réception → réponse → IMAP → classement → CRM
//
// Plafonds EN DUR, non contournables par la configuration : un pilote ne peut
// pas dépasser PILOT_MAX_PROSPECTS destinataires, quoi qu'on règle ailleurs.
// C'est volontaire — la protection ne sert à rien si elle est paramétrable.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getPolicy } from "@/lib/policy";
import { qualifyProspect } from "@/lib/qualification";
import { createCampaign, addProspectsToCampaign, prepareCampaign } from "@/lib/campaign";
import { preflight, PILOT_MAX_PROSPECTS } from "./preflight";

export type PilotPlan = {
  ok: boolean;
  campaignId?: string;
  campaignSlug?: string;
  /** Prospects retenus, dans l'ordre de priorité. */
  selected: Array<{ id: string; name: string; email: string; score: number | null; city: string }>;
  rejected: Array<{ name: string; reason: string }>;
  blockers: string[];
  warnings: string[];
  nextSteps: string[];
  summary: string;
};

/**
 * Prépare une campagne pilote.
 *
 * NE PRÉPARE QUE. Les emails restent en attente d'approbation, et l'envoi
 * reste soumis à DRY_RUN, à la conformité et à votre validation.
 */
export async function preparePilot(
  options: { max?: number; city?: string; sector?: string; name?: string } = {},
): Promise<PilotPlan> {
  const demande = options.max ?? PILOT_MAX_PROSPECTS;
  const max = Math.min(demande, PILOT_MAX_PROSPECTS);

  const check = await preflight();
  const blockers = check.blockers.map((b) => `${b.label} : ${b.detail}`);
  const warnings = check.warnings.map((w) => `${w.label} : ${w.detail}`);

  if (!check.coherent) {
    return {
      ok: false, selected: [], rejected: [], blockers, warnings,
      nextSteps: check.blockers.map((b) => b.fix).filter((f): f is string => Boolean(f)),
      summary: `Pilote refusé : ${check.summary}`,
    };
  }

  const policy = await getPolicy();

  // --- Sélection des candidats --------------------------------------------
  // On part des prospects les mieux notés, jamais contactés, avec un email.
  const candidats = await prisma.prospect.findMany({
    where: {
      isDemo: false,
      primaryContactId: { not: null },
      status: { notIn: ["OPTOUT", "BLOCKED", "WON", "LOST", "CONTACTED"] },
      sendLogs: { none: {} },
      replies: { none: {} },
      ...(options.city ? { city: { contains: options.city } } : {}),
      ...(options.sector ? { sector: { contains: options.sector } } : {}),
    },
    orderBy: [{ overallScore: "desc" }, { createdAt: "asc" }],
    take: max * 4, // marge : la qualification en écartera une partie
    include: { primaryContact: true },
  });

  const selected: PilotPlan["selected"] = [];
  const rejected: PilotPlan["rejected"] = [];

  // Les prospects exclus par la requête ci-dessus (opposition, déjà contactés,
  // sans email) n'apparaîtraient nulle part. On les récupère pour les nommer :
  // un prospect écarté doit toujours l'être AVEC une raison lisible.
  const ecartesEnAmont = await prisma.prospect.findMany({
    where: {
      isDemo: false,
      ...(options.city ? { city: { contains: options.city } } : {}),
      ...(options.sector ? { sector: { contains: options.sector } } : {}),
      OR: [
        { status: { in: ["OPTOUT", "BLOCKED", "WON", "LOST", "CONTACTED"] } },
        { primaryContactId: null },
        { sendLogs: { some: {} } },
        { replies: { some: {} } },
      ],
    },
    select: { name: true, status: true, primaryContactId: true, _count: { select: { sendLogs: true, replies: true } } },
    take: 50,
  });

  for (const p of ecartesEnAmont) {
    rejected.push({
      name: p.name,
      reason:
        p.status === "OPTOUT"
          ? "A demandé à ne plus être contacté."
          : ["BLOCKED", "WON", "LOST"].includes(p.status)
            ? `Statut ${p.status} : hors circuit de prospection.`
            : p.status === "CONTACTED"
              ? "Déjà contacté."
              : !p.primaryContactId
                ? "Aucun email professionnel vérifié."
                : p._count.replies > 0
                  ? "A déjà répondu : conversation en cours, pas prospection."
                  : "Déjà destinataire d'un envoi.",
    });
  }

  for (const p of candidats) {
    if (selected.length >= max) break;

    const q = await qualifyProspect(p.id, { policy });
    if (q.verdict !== "QUALIFIED") {
      rejected.push({ name: p.name, reason: q.summary });
      continue;
    }
    selected.push({
      id: p.id, name: p.name,
      email: p.primaryContact!.email,
      score: p.overallScore, city: p.city,
    });
  }

  if (selected.length === 0) {
    return {
      ok: false, selected: [], rejected, blockers, warnings,
      nextSteps: [
        "Aucun prospect qualifié disponible. Lancez d'abord une mission :",
        'npm run amyn -- mission "Prospecte les coiffeurs à Lille"',
      ],
      summary: `Aucun prospect qualifié parmi ${candidats.length} candidat(s) examiné(s).`,
    };
  }

  // --- Campagne pilote -----------------------------------------------------
  const campagne = await createCampaign({
    name: options.name ?? `PILOTE — ${new Date().toLocaleDateString("fr-FR")}`,
    targetCriteria: { pilote: true, city: options.city, sector: options.sector, max },
  });

  // Le plafond de la campagne est calé sur le pilote : même si la politique
  // globale autorise davantage, cette campagne ne dépassera pas.
  await prisma.campaign.update({
    where: { id: campagne.id },
    data: { dailyLimit: Math.min(max, policy.dailyLimit), maxFollowUps: 0 },
  });

  await addProspectsToCampaign(campagne.id, selected.map((s) => s.id));
  const prep = await prepareCampaign(campagne.id);

  await logActivity({
    actor: "HUMAN", module: "CAMPAIGN", action: "campaign.pilot_prepared",
    entityType: "Campaign", entityId: campagne.id,
    summary:
      `Campagne pilote préparée : ${prep.prepared} email(s) pour ${selected.length} prospect(s) ` +
      `(plafond pilote ${PILOT_MAX_PROSPECTS}). En attente d'approbation.`,
    details: { selected: selected.map((s) => s.name), rejected: rejected.length },
  });

  const nextSteps = [
    `Relisez chaque email : /campaigns/${campagne.id}`,
    `Approuvez : npm run amyn -- campaign approve ${campagne.slug}`,
    check.canSendForReal
      ? `Envoyez : npm run amyn -- campaign send ${campagne.slug}`
      : `Pour un envoi RÉEL : configurer SMTP puis DRY_RUN=false. En l'état, l'envoi sera simulé.`,
    "Après réception, surveillez : npm run amyn -- tick",
  ];

  return {
    ok: true,
    campaignId: campagne.id,
    campaignSlug: campagne.slug,
    selected, rejected, blockers, warnings, nextSteps,
    summary:
      `Pilote « ${campagne.name} » : ${prep.prepared} email(s) prêt(s) pour ${selected.length} prospect(s), ` +
      `${rejected.length} écarté(s). Mode ${check.mode}. Rien n'est envoyé sans votre approbation.`,
  };
}
