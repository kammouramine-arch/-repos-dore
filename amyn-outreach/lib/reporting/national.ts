// ---------------------------------------------------------------------------
// TABLEAU DE BORD NATIONAL — l'état réel de la prospection
//
// UNE RÈGLE, ET ELLE COMPTE. Un compteur à zéro et un compteur qu'on ne sait
// pas mesurer ne se ressemblent pas : le premier dit « rien ne s'est passé »,
// le second dit « je ne sais pas ». Les afficher pareil transformerait une
// ignorance en résultat rassurant. Chaque métrique porte donc soit une valeur
// mesurée, soit un motif expliquant pourquoi elle ne l'est pas.
//
// Tous les chiffres viennent d'un COMPTAGE EN BASE. Aucun n'est estimé,
// extrapolé, ni recopié d'une exécution précédente.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { imapStatus } from "@/lib/imap/config";
import { getPolicy } from "@/lib/policy";

export type Metric = {
  key: string;
  label: string;
  /** Valeur mesurée. null quand la donnée n'est pas mesurable — jamais 0 par défaut. */
  value: number | null;
  /** Pourquoi la valeur est absente. Renseigné si et seulement si value === null. */
  indisponible?: string;
  detail?: string;
};

export type MetricGroup = { title: string; note?: string; metrics: Metric[] };

export type NationalReport = {
  generatedAt: Date;
  /** Les prospects de démonstration sont exclus de tous les comptages. */
  demoExclus: number;
  groups: MetricGroup[];
  alerts: string[];
};

const POSITIVES = ["INTERESTED", "POSITIVE", "PRICE_REQUEST", "MEETING_REQUEST"];
const NEGATIVES = ["NOT_INTERESTED", "NEGATIVE"];

/** Les prospects de démonstration ne comptent pas : ce sont des exemples. */
const REELS = { isDemo: false } as const;

export async function nationalReport(): Promise<NationalReport> {
  const alerts: string[] = [];
  const maintenant = new Date();
  const ilYaSeptJours = new Date(maintenant.getTime() - 7 * 24 * 3600_000);

  // --- DÉCOUVERTE ---------------------------------------------------------
  const [
    demoExclus,
    decouvertes,
    recentes,
    avecSite,
    auditees,
    avecContact,
    avecEmailValide,
    avecSiret,
    sitesVerifies,
    sitesNonCherches,
    sansSite,
    sitesNonProuves,
  ] = await Promise.all([
    prisma.prospect.count({ where: { isDemo: true } }),
    prisma.prospect.count({ where: REELS }),
    prisma.prospect.count({ where: { ...REELS, createdAt: { gte: ilYaSeptJours } } }),
    prisma.prospect.count({ where: { ...REELS, website: { not: null } } }),
    prisma.prospect.count({ where: { ...REELS, auditedAt: { not: null } } }),
    prisma.prospect.count({ where: { ...REELS, contacts: { some: {} } } }),
    prisma.prospect.count({
      where: { ...REELS, contacts: { some: { validationStatus: "SYNTAX_OK" } } },
    }),
    prisma.prospect.count({ where: { ...REELS, siret: { not: null } } }),
    prisma.prospect.count({ where: { ...REELS, websiteStatus: "CONFIRMED" } }),
    prisma.prospect.count({ where: { ...REELS, websiteStatus: "UNKNOWN" } }),
    prisma.prospect.count({ where: { ...REELS, websiteStatus: "NOT_FOUND" } }),
    prisma.prospect.count({ where: { ...REELS, websiteStatus: "UNCONFIRMED" } }),
  ]);

  // --- TERRITOIRES --------------------------------------------------------
  const territoiresTotal = await prisma.territory.count();
  const parStatut = await prisma.territory.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const statut: Record<string, number> = {};
  for (const l of parStatut) statut[l.status] = l._count._all;

  const agregats = await prisma.territory.aggregate({
    _sum: { discovered: true, created: true, duplicates: true, errors: true },
  });

  // « En cours » ne se lit pas dans le statut : un territoire entamé puis
  // rendu par le worker repasse en PENDING, avec son point de reprise. Ce qui
  // le distingue d'un territoire jamais touche, c'est d'avoir deja vu des
  // entreprises.
  const territoiresEnCours = await prisma.territory.count({
    where: { discovered: { gt: 0 }, status: { notIn: ["DONE", "SATURATED"] } },
  });

  const aucunBalayage = territoiresTotal === 0;
  const motifSansBalayage =
    "Aucun territoire planifié : le balayage national n'a jamais tourné. " +
    "npm run amyn -- territory plan";

  const termines = (statut.DONE ?? 0) + (statut.SATURATED ?? 0);

  if ((statut.SATURATED ?? 0) > 0) {
    alerts.push(
      `${statut.SATURATED} territoire(s) saturé(s) : la source a cessé de servir des résultats ` +
        `avant d'avoir tout donné. Ces entreprises manquent à la base tant que le territoire ` +
        `n'est pas subdivisé — npm run amyn -- territory subdivide <id>.`,
    );
  }
  if ((statut.FAILED ?? 0) > 0) {
    alerts.push(`${statut.FAILED} territoire(s) en échec : voir npm run amyn -- territory status.`);
  }

  // --- QUALIFICATION ------------------------------------------------------
  const parQualification = await prisma.prospect.groupBy({
    by: ["qualification"],
    where: REELS,
    _count: { _all: true },
  });
  const qual: Record<string, number> = {};
  for (const l of parQualification) qual[l.qualification] = l._count._all;

  // --- PRÉPARATION ET ENVOI ----------------------------------------------
  const [
    prepares, approuves, envoyes, simules, bloques, echecsEnvoi,
    relancesPretes, relancesEnvoyees, enAttenteApprobation,
  ] = await Promise.all([
      prisma.emailDraft.count({ where: { isActive: true } }),
      prisma.emailDraft.count({ where: { isActive: true, approvedAt: { not: null } } }),
      prisma.sendLog.count({ where: { status: "SENT" } }),
      prisma.sendLog.count({ where: { status: "SIMULATED" } }),
      prisma.sendLog.count({ where: { status: "BLOCKED" } }),
      prisma.sendLog.count({ where: { status: "FAILED" } }),
      prisma.emailDraft.count({ where: { isActive: true, sequenceStep: { gte: 1 } } }),
      prisma.sendLog.count({ where: { status: "SENT", sequenceStep: { gte: 1 } } }),
      prisma.campaignMember.count({ where: { status: "READY" } }),
    ]);

  const policy = await getPolicy();

  // « Prêts à partir » : qualifiés, email rédigé et vérifié, aucun blocage
  // connu. C'est ce que l'envoi — manuel ou automatique — trouverait s'il
  // tournait maintenant.
  const [pretsAPartir, exclus, relancesPrevues] = await Promise.all([
    prisma.prospect.count({
      where: {
        ...REELS,
        qualification: "QUALIFIED",
        status: { notIn: ["OPTOUT", "BLOCKED", "WON", "LOST", "CONTACTED"] },
        primaryContactId: { not: null },
        emailDrafts: { some: { isActive: true, verificationPassed: true } },
      },
    }),
    prisma.prospect.count({
      where: {
        isDemo: false,
        OR: [
          { qualification: "NOT_QUALIFIED" },
          { status: { in: ["OPTOUT", "BLOCKED"] } },
        ],
      },
    }),
    prisma.campaignMember.count({
      where: { status: { in: ["READY", "APPROVED"] }, sequenceStep: { gte: 1 } },
    }),
  ]);

  if (policy.autoSendEnabled) {
    alerts.push(
      "L'envoi automatique est ARMÉ : les emails qualifiés partent sans relecture. " +
        "Le désarmer : npm run amyn -- policy autoSendEnabled false",
    );
  }

  // --- RÉPONSES -----------------------------------------------------------
  const imap = imapStatus();
  const [reponses, positives, negatives, optOutsReponses, rebonds, oppositions] = await Promise.all([
    prisma.reply.count(),
    prisma.reply.count({ where: { classification: { in: POSITIVES } } }),
    prisma.reply.count({ where: { classification: { in: NEGATIVES } } }),
    prisma.reply.count({ where: { classification: "OPT_OUT" } }),
    prisma.reply.count({ where: { classification: "BOUNCE" } }),
    prisma.suppression.count(),
  ]);

  // Une boîte non configurée ne PEUT pas avoir reçu de réponse. Afficher « 0 »
  // laisserait croire que personne n'a répondu, alors que personne n'a lu.
  const reponsesMesurables = imap.configured || reponses > 0;
  const motifImap = `Boîte de réception non configurée (${imap.missing.join(", ")}) : aucune lecture possible.`;

  if (!imap.configured && envoyes > 0) {
    alerts.push(
      `${envoyes} email(s) envoyé(s) mais la boîte de réception n'est pas configurée : ` +
        `les réponses ne sont pas lues, y compris d'éventuelles demandes de désinscription.`,
    );
  }

  const groups: MetricGroup[] = [
    {
      title: "Mode d'envoi",
      note: policy.autoSendEnabled
        ? "ARMÉ : les emails qualifiés partent sans relecture. Tous les autres contrôles restent actifs."
        : "Désarmé : chaque email attend votre relecture.",
      metrics: [
        {
          key: "autopilot",
          label: "Envoi automatique",
          value: policy.autoSendEnabled ? 1 : 0,
          detail: policy.autoSendEnabled
            ? "Armé. Désarmer : npm run amyn -- policy autoSendEnabled false"
            : "Désarmé. Armer : npm run amyn -- policy autoSendEnabled true",
        },
        {
          key: "daily_limit",
          label: "Plafond quotidien",
          value: policy.dailyLimit,
          detail: `${policy.minDelaySeconds} s entre deux envois, fenêtre ${policy.sendWindowStartHour}h–${policy.sendWindowEndHour}h.`,
        },
        {
          key: "autopilot_max_run",
          label: "Envois par exécution",
          value: policy.autoSendMaxPerRun,
        },
        {
          key: "circuit_breaker",
          label: "Échecs avant coupure",
          value: policy.autoSendMaxConsecutiveFailures,
          detail: "Au-delà, l'envoi automatique se désactive seul.",
        },
      ],
    },
    {
      title: "Découverte",
      note: "Entreprises réellement enregistrées en base, sources tracées.",
      metrics: [
        { key: "discovered", label: "Entreprises découvertes", value: decouvertes },
        {
          key: "recent",
          label: "Nouvelles (7 derniers jours)",
          value: recentes,
          detail: recentes === 0 && decouvertes > 0 ? "Aucune découverte récente." : undefined,
        },
        {
          key: "duplicates",
          label: "Doublons écartés au balayage",
          value: aucunBalayage ? null : (agregats._sum.duplicates ?? 0),
          indisponible: aucunBalayage ? motifSansBalayage : undefined,
          detail: "Comptés comme doublons, jamais comme « non qualifié ».",
        },
        {
          key: "siret",
          label: "Entreprises avec SIRET",
          value: avecSiret,
          detail: "Identifiant légal : la clé de déduplication la plus fiable.",
        },
      ],
    },
    {
      title: "Territoires",
      note: "Le balayage national avance territoire par territoire, avec point de reprise.",
      metrics: [
        {
          key: "territories_done",
          label: "Territoires terminés",
          value: aucunBalayage ? null : termines,
          indisponible: aucunBalayage ? motifSansBalayage : undefined,
        },
        {
          key: "territories_left",
          label: "Territoires restants",
          value: aucunBalayage ? null : territoriesRestants(territoiresTotal, termines),
          indisponible: aucunBalayage ? motifSansBalayage : undefined,
        },
        {
          key: "territories_running",
          label: "Territoires en cours",
          value: aucunBalayage ? null : territoiresEnCours,
          indisponible: aucunBalayage ? motifSansBalayage : undefined,
          detail: "Commencés, pas encore couverts : leur reprise pointe une page suivante.",
        },
        {
          key: "territories_saturated",
          label: "Territoires saturés (à subdiviser)",
          value: aucunBalayage ? null : (statut.SATURATED ?? 0),
          indisponible: aucunBalayage ? motifSansBalayage : undefined,
          detail: "Volume supérieur à ce que la source accepte de servir.",
        },
        {
          key: "territories_failed",
          label: "Territoires en échec",
          value: aucunBalayage ? null : (statut.FAILED ?? 0),
          indisponible: aucunBalayage ? motifSansBalayage : undefined,
        },
        {
          key: "progress",
          label: "Progression (%)",
          value: aucunBalayage ? null : Math.round((termines / territoiresTotal) * 100),
          indisponible: aucunBalayage ? motifSansBalayage : undefined,
        },
      ],
    },
    {
      title: "Enrichissement",
      note: "Aucune adresse n'est devinée : ces chiffres ne comptent que ce qui a été trouvé.",
      metrics: [
        {
          key: "websites",
          label: "Sites web trouvés",
          value: avecSite,
          detail: "Le registre n'en publie aucun : chacun a été cherché.",
        },
        {
          key: "websites_verified",
          label: "Sites dont l'appartenance est prouvée",
          value: sitesVerifies,
          detail:
            "SIREN, adresse ou téléphone de l'entreprise retrouvé sur le site. " +
            "Un domaine plausible mais non prouvé n'est jamais enregistré.",
        },
        {
          key: "websites_none",
          label: "Entreprises sans site",
          value: sansSite,
          detail: "Cherché, aucun domaine ne répond. C'est en soi une opportunité.",
        },
        {
          key: "websites_unproven",
          label: "Sites non prouvés (écartés)",
          value: sitesNonProuves,
          detail: "Un domaine répond mais rien ne prouve qu'il est le leur — probable homonyme.",
        },
        {
          key: "websites_pending",
          label: "Sites pas encore cherchés",
          value: sitesNonCherches,
        },
        { key: "audited", label: "Entreprises auditées", value: auditees },
        { key: "emails_found", label: "Emails trouvés", value: avecContact },
        {
          key: "emails_valid",
          label: "Emails de syntaxe valide",
          value: avecEmailValide,
          detail:
            "Syntaxe vérifiée et source conservée. Ce n'est pas une garantie de délivrabilité : " +
            "aucune vérification ne teste la boîte sans lui écrire.",
        },
      ],
    },
    {
      title: "Qualification",
      note: "Sévérité inchangée. Sans email vérifiable, un prospect reste NOT_QUALIFIED.",
      metrics: [
        { key: "qualified", label: "QUALIFIED", value: qual.QUALIFIED ?? 0 },
        { key: "not_qualified", label: "NOT_QUALIFIED", value: qual.NOT_QUALIFIED ?? 0 },
        { key: "needs_human", label: "NEEDS_HUMAN", value: qual.NEEDS_HUMAN ?? 0 },
        {
          key: "excluded",
          label: "Prospects exclus",
          value: exclus,
          detail: "Non qualifiés, opposés ou bloqués. Ils ne repasseront pas dans le circuit.",
        },
        {
          key: "pending_qual",
          label: "En attente de qualification",
          value: qual.PENDING ?? 0,
          detail: "Découverts, pas encore enrichis ni jugés.",
        },
      ],
    },
    {
      title: "Envoi",
      note: "Aucun envoi ne part sans approbation humaine explicite.",
      metrics: [
        { key: "prepared", label: "Emails préparés", value: prepares },
        {
          key: "awaiting_approval",
          label: "Emails en attente d'approbation",
          value: enAttenteApprobation,
          detail: "Rédigés et vérifiés. Rien ne part sans votre validation explicite.",
        },
        { key: "approved", label: "Emails approuvés", value: approuves },
        {
          key: "ready_to_send",
          label: "Emails prêts à partir",
          value: pretsAPartir,
          detail: "Qualifiés, rédigés, vérifiés, aucun blocage connu.",
        },
        { key: "sent", label: "Emails réellement envoyés", value: envoyes },
        {
          key: "simulated",
          label: "Envois simulés (DRY_RUN)",
          value: simules,
          detail: "Ne comptent pas dans le plafond quotidien : une démonstration ne bloque pas un envoi réel.",
        },
        { key: "blocked", label: "Envois bloqués par la conformité", value: bloques },
        { key: "failed", label: "Échecs d'envoi", value: echecsEnvoi },
        { key: "followups_ready", label: "Relances préparées", value: relancesPretes },
        {
          key: "followups_scheduled",
          label: "Relances programmées",
          value: relancesPrevues,
          detail: `Limite : ${policy.maxFollowUps} relance(s) par prospect.`,
        },
        { key: "followups_sent", label: "Relances envoyées", value: relancesEnvoyees },
      ],
    },
    {
      title: "Réponses",
      note: "Lues via IMAP. Une opposition arrête immédiatement toute sollicitation.",
      metrics: [
        {
          key: "replies",
          label: "Réponses reçues",
          value: reponsesMesurables ? reponses : null,
          indisponible: reponsesMesurables ? undefined : motifImap,
        },
        {
          key: "replies_positive",
          label: "Réponses positives",
          value: reponsesMesurables ? positives : null,
          indisponible: reponsesMesurables ? undefined : motifImap,
        },
        {
          key: "replies_negative",
          label: "Réponses négatives",
          value: reponsesMesurables ? negatives : null,
          indisponible: reponsesMesurables ? undefined : motifImap,
        },
        {
          key: "bounces",
          label: "Rebonds",
          value: reponsesMesurables ? rebonds : null,
          indisponible: reponsesMesurables ? undefined : motifImap,
        },
        {
          key: "optouts",
          label: "Oppositions enregistrées",
          value: oppositions,
          detail:
            optOutsReponses > 0
              ? `dont ${optOutsReponses} issue(s) d'une réponse explicite.`
              : "Liste d'opposition : ces adresses ne sont plus jamais sollicitées.",
        },
      ],
    },
  ];

  return { generatedAt: maintenant, demoExclus, groups, alerts };
}

function territoriesRestants(total: number, termines: number): number {
  return Math.max(total - termines, 0);
}

/** Version compacte, pour la ligne de commande et les tests. */
export function flatten(report: NationalReport): Record<string, number | null> {
  const plat: Record<string, number | null> = {};
  for (const g of report.groups) for (const m of g.metrics) plat[m.key] = m.value;
  return plat;
}
