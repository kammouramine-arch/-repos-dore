// ---------------------------------------------------------------------------
// REPORTING — uniquement ce qui est mesurable
//
// RÈGLE : aucune métrique inventée, aucune estimation présentée comme un fait.
// Un taux dont le dénominateur est nul n'est pas 0 % : il est INDISPONIBLE, et
// le dit. Une conversion non observée n'est pas déduite.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { REPLY_CLASSES, type ReplyClass } from "@/lib/constants";

/** Un taux qui sait dire qu'il ne sait pas. */
export type Taux = {
  value: number | null;
  numerator: number;
  denominator: number;
  label: string;
};

function taux(numerator: number, denominator: number, label: string): Taux {
  return {
    value: denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null,
    numerator, denominator, label,
  };
}

export type Report = {
  periode: { depuis: Date | null; libelle: string };
  prospection: {
    trouves: number;
    qualifies: number;
    aTrancher: number;
    ecartes: number;
    nonQualifiesEncore: number;
    avecEmail: number;
    tauxQualification: Taux;
    tauxContactTrouve: Taux;
  };
  envois: {
    prepares: number;
    enAttenteApprobation: number;
    reels: number;
    simules: number;
    bloques: number;
    echecs: number;
    tauxEchec: Taux;
  };
  reponses: {
    total: number;
    parClasse: Record<string, number>;
    positives: number;
    rendezVous: number;
    questions: number;
    optOuts: number;
    needsHuman: number;
    tauxReponse: Taux;
    tauxPositif: Taux;
    tauxOptOut: Taux;
  };
  relances: {
    preparees: number;
    envoyees: number;
    prospectsRelancables: number;
  };
  conversion: {
    clients: number;
    caSigne: number;
    tauxConversion: Taux;
  };
  sante: {
    erreurs24h: number;
    rebonds: number;
    tauxRebond: Taux;
    dernierTour: Date | null;
    jobsEnEchec: number;
  };
  /** Ce que ce rapport ne peut PAS dire, et pourquoi. */
  nonMesure: string[];
};

export async function buildReport(options: { depuis?: Date } = {}): Promise<Report> {
  const depuis = options.depuis ?? null;
  const filtreDate = depuis ? { gte: depuis } : undefined;
  const w = <T extends object>(base: T) => (filtreDate ? { ...base, createdAt: filtreDate } : base);

  const [
    trouves, qualifies, aTrancher, ecartes, pending, avecEmail,
    prepares, enAttente, reels, simules, bloques, echecs,
    reponses, optOuts, erreurs24h, rebonds,
    relancesPreparees, relancesEnvoyees,
    clients, dernierJob, jobsEchec,
  ] = await Promise.all([
    prisma.prospect.count({ where: w({ isDemo: false }) }),
    prisma.prospect.count({ where: w({ isDemo: false, qualification: "QUALIFIED" }) }),
    prisma.prospect.count({ where: w({ isDemo: false, qualification: "NEEDS_HUMAN" }) }),
    prisma.prospect.count({ where: w({ isDemo: false, qualification: "NOT_QUALIFIED" }) }),
    prisma.prospect.count({ where: w({ isDemo: false, qualification: "PENDING" }) }),
    prisma.prospect.count({ where: w({ isDemo: false, primaryContactId: { not: null } }) }),

    prisma.emailDraft.count({ where: depuis ? { generatedAt: filtreDate } : {} }),
    prisma.campaignMember.count({ where: { status: "READY" } }),
    prisma.sendLog.count({ where: w({ status: "SENT" }) }),
    prisma.sendLog.count({ where: w({ status: "SIMULATED" }) }),
    prisma.sendLog.count({ where: w({ status: "BLOCKED" }) }),
    prisma.sendLog.count({ where: w({ status: "FAILED" }) }),

    prisma.reply.groupBy({
      by: ["classification"],
      _count: { _all: true },
      where: depuis ? { receivedAt: filtreDate } : {},
    }),
    prisma.suppression.count({ where: w({ reason: "UNSUBSCRIBED" }) }),
    prisma.activityLog.count({
      where: { level: "ERROR", createdAt: { gte: new Date(Date.now() - 86400000) } },
    }),
    prisma.sendLog.count({ where: w({ bounceType: { not: null } }) }),

    prisma.emailDraft.count({ where: { sequenceStep: { gt: 0 } } }),
    prisma.sendLog.count({ where: w({ sequenceStep: { gt: 0 }, status: { in: ["SENT", "SIMULATED"] } }) }),

    prisma.client.findMany({ where: w({ isDemo: false }), select: { offerPrice: true } }),
    prisma.jobRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.jobRun.count({ where: { status: "FAILED" } }),
  ]);

  const parClasse = Object.fromEntries(REPLY_CLASSES.map((c) => [c, 0])) as Record<string, number>;
  for (const r of reponses) parClasse[r.classification] = r._count._all;

  const totalReponses = reponses.reduce((s, r) => s + r._count._all, 0);
  const positives =
    (parClasse.INTERESTED ?? 0) + (parClasse.PRICE_REQUEST ?? 0) + (parClasse.MEETING_REQUEST ?? 0);
  const needsHuman = parClasse.NEEDS_HUMAN ?? 0;

  // Base de calcul des taux : les emails réellement partis. En simulation, on
  // le dit plutôt que de faire passer un chiffre simulé pour un résultat.
  const baseEnvois = reels;

  const nonMesure: string[] = [];
  if (reels === 0) {
    nonMesure.push(
      "Aucun email réel n'a été envoyé : les taux de réponse, de positif et d'opposition n'ont pas de base de calcul.",
    );
  }
  if (simules > 0 && reels === 0) {
    nonMesure.push(
      `${simules} envoi(s) simulé(s) : ils ne comptent pas comme des envois et ne produisent aucune statistique.`,
    );
  }
  nonMesure.push(
    "Les ouvertures et les clics ne sont pas mesurés : aucun pixel ni lien de traçage n'est inséré dans les emails.",
  );
  const clientsSansOrigine = await prisma.client.count({ where: { prospectId: null, isDemo: false } });
  if (clientsSansOrigine > 0) {
    nonMesure.push(
      `${clientsSansOrigine} client(s) sans prospect d'origine : ils ne sont pas attribuables à une campagne.`,
    );
  }

  return {
    periode: {
      depuis,
      libelle: depuis ? `depuis le ${depuis.toLocaleDateString("fr-FR")}` : "depuis le début",
    },
    prospection: {
      trouves, qualifies, aTrancher, ecartes, nonQualifiesEncore: pending, avecEmail,
      tauxQualification: taux(qualifies, trouves, "prospects qualifiés / trouvés"),
      tauxContactTrouve: taux(avecEmail, trouves, "emails trouvés / prospects"),
    },
    envois: {
      prepares, enAttenteApprobation: enAttente, reels, simules, bloques, echecs,
      tauxEchec: taux(echecs, reels + echecs, "échecs / tentatives réelles"),
    },
    reponses: {
      total: totalReponses,
      parClasse,
      positives,
      rendezVous: parClasse.MEETING_REQUEST ?? 0,
      questions: (parClasse.QUESTION ?? 0) + (parClasse.PRICE_REQUEST ?? 0),
      optOuts,
      needsHuman,
      tauxReponse: taux(totalReponses, baseEnvois, "réponses / emails réellement envoyés"),
      tauxPositif: taux(positives, baseEnvois, "réponses positives / emails réellement envoyés"),
      tauxOptOut: taux(optOuts, baseEnvois, "oppositions / emails réellement envoyés"),
    },
    relances: {
      preparees: relancesPreparees,
      envoyees: relancesEnvoyees,
      prospectsRelancables: await prisma.campaignMember.count({ where: { status: "SENT" } }),
    },
    conversion: {
      clients: clients.length,
      caSigne: clients.reduce((s, c) => s + c.offerPrice, 0),
      tauxConversion: taux(clients.length, baseEnvois, "clients / emails réellement envoyés"),
    },
    sante: {
      erreurs24h, rebonds,
      tauxRebond: taux(rebonds, baseEnvois, "rebonds / emails réellement envoyés"),
      dernierTour: dernierJob?.startedAt ?? null,
      jobsEnEchec: jobsEchec,
    },
    nonMesure,
  };
}

/** Bilan par mission : ce qu'une instruction a réellement produit. */
export async function missionReport(missionId: string) {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  if (!mission) throw new Error(`Mission introuvable : ${missionId}`);

  if (!mission.campaignId) {
    return {
      mission,
      contactes: 0, reponses: 0, positives: 0, optOuts: 0, needsHuman: 0,
      note: "Aucune campagne rattachée : la mission s'est arrêtée avant.",
    };
  }

  const [contactes, replies] = await Promise.all([
    prisma.sendLog.count({
      where: { campaignId: mission.campaignId, status: { in: ["SENT", "SIMULATED"] } },
    }),
    prisma.reply.findMany({
      where: { campaignId: mission.campaignId },
      select: { classification: true },
    }),
  ]);

  const compte = (cls: ReplyClass) => replies.filter((r) => r.classification === cls).length;

  return {
    mission,
    contactes,
    reponses: replies.length,
    positives: compte("INTERESTED") + compte("PRICE_REQUEST") + compte("MEETING_REQUEST"),
    optOuts: compte("OPT_OUT"),
    needsHuman: compte("NEEDS_HUMAN"),
    note: null,
  };
}
