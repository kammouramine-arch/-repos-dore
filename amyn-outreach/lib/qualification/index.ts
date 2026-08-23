// ---------------------------------------------------------------------------
// QUALIFICATION — ce prospect mérite-t-il d'être contacté ?
//
// Collecter une entreprise ne suffit pas. Avant d'écrire à quelqu'un, il faut
// pouvoir dire POURQUOI on lui écrit, et sur quelles données.
//
// RÈGLE : on ne devine pas une opportunité. Chaque critère s'appuie sur une
// donnée réellement en base. Quand les informations manquent pour trancher,
// le verdict est NEEDS_HUMAN — jamais un « probablement oui ».
//
// Ce module ne modifie rien d'autre que le champ `qualification` du prospect.
// Il ne décide pas d'envoyer : la conformité garde le dernier mot.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { resolveSector } from "@/lib/research/sectors";
import { getPolicy, type Policy } from "@/lib/policy";

export type Verdict = "QUALIFIED" | "NOT_QUALIFIED" | "NEEDS_HUMAN" | "PENDING";

export type Critere = {
  id: string;
  label: string;
  /** true = critère satisfait, false = non satisfait, null = donnée absente */
  passed: boolean | null;
  detail: string;
};

export type Qualification = {
  verdict: Verdict;
  /** Ce qui rend le prospect intéressant. */
  reasons: string[];
  /** Ce qui interdit de le contacter. Un seul blocage suffit. */
  blockers: string[];
  /** Ce qu'on ignore et qui empêche de conclure. */
  unknowns: string[];
  criteres: Critere[];
  summary: string;
};

/**
 * Blocages ABSOLUS : ils ne dépendent d'aucun réglage et ne peuvent jamais
 * être contournés, ni par une mission, ni par l'IA, ni par un score élevé.
 */
const STATUTS_BLOQUANTS = ["OPTOUT", "BLOCKED", "WON", "LOST"];

export async function qualifyProspect(
  prospectId: string,
  options: { policy?: Policy; persist?: boolean } = {},
): Promise<Qualification> {
  const policy = options.policy ?? (await getPolicy());

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: {
      primaryContact: true,
      contacts: true,
      issues: { select: { id: true, severity: true, type: true } },
      sources: { select: { kind: true, label: true } },
      sendLogs: { orderBy: { createdAt: "desc" }, take: 1 },
      replies: { select: { id: true, classification: true } },
    },
  });
  if (!prospect) throw new Error(`Prospect introuvable : ${prospectId}`);

  const criteres: Critere[] = [];
  const reasons: string[] = [];
  const blockers: string[] = [];
  const unknowns: string[] = [];

  // --- 1. BLOCAGES ABSOLUS ------------------------------------------------
  if (prospect.isDemo) {
    blockers.push("Fiche de démonstration : elle ne peut déclencher aucun contact.");
  }

  if (STATUTS_BLOQUANTS.includes(prospect.status)) {
    blockers.push(
      prospect.status === "OPTOUT"
        ? "Le prospect a demandé à ne plus être contacté."
        : `Statut ${prospect.status} : ce prospect est hors circuit.`,
    );
  }

  const adresses = prospect.contacts.map((c) => c.email.toLowerCase());
  if (adresses.length > 0) {
    const domaines = [...new Set(adresses.map((e) => e.split("@")[1]).filter(Boolean))];
    const opposition = await prisma.suppression.findFirst({
      where: { OR: [{ email: { in: adresses } }, { domain: { in: domaines } }] },
    });
    if (opposition) {
      blockers.push(
        `Adresse ou domaine en liste d'opposition (${opposition.reason}) : contact interdit.`,
      );
    }
  }

  criteres.push({
    id: "no_optout",
    label: "Aucune opposition enregistrée",
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? "Aucun blocage." : blockers.join(" "),
  });

  // --- 2. CONTACT RÉCENT --------------------------------------------------
  const dernierEnvoi = prospect.sendLogs[0];
  if (dernierEnvoi) {
    const jours = (Date.now() - dernierEnvoi.createdAt.getTime()) / 86400000;
    const recent = jours < policy.recontactCooldownDays;
    criteres.push({
      id: "cooldown",
      label: "Délai de recontact respecté",
      passed: !recent,
      detail: recent
        ? `Contacté il y a ${Math.round(jours)} jour(s), délai de ${policy.recontactCooldownDays} jours non écoulé.`
        : `Dernier contact il y a ${Math.round(jours)} jour(s).`,
    });
    if (recent) {
      blockers.push(
        `Déjà contacté il y a ${Math.round(jours)} jour(s) : le délai de recontact n'est pas écoulé.`,
      );
    }
  } else {
    criteres.push({
      id: "cooldown",
      label: "Délai de recontact respecté",
      passed: true,
      detail: "Jamais contacté.",
    });
    reasons.push("Jamais contacté par AMYN.");
  }

  if (prospect.replies.length > 0) {
    blockers.push("Ce prospect a déjà répondu : la conversation est en cours, pas la prospection.");
  }

  // --- 3. SECTEUR ---------------------------------------------------------
  const secteur = resolveSector(prospect.sector);
  criteres.push({
    id: "sector",
    label: "Secteur travaillé par AMYN",
    passed: Boolean(secteur),
    detail: secteur
      ? `« ${prospect.sector} » correspond à ${secteur.def.label}.`
      : `« ${prospect.sector} » ne fait pas partie des secteurs connus.`,
  });
  if (secteur) reasons.push(`Secteur ciblé : ${secteur.def.label}.`);
  else unknowns.push(`Secteur « ${prospect.sector} » inconnu : sa pertinence n'est pas établie.`);

  // --- 4. ENTREPRISE RÉELLEMENT IDENTIFIÉE --------------------------------
  const sourcesFiables = prospect.sources.filter((s) => s.kind !== "MANUAL");
  criteres.push({
    id: "identified",
    label: "Entreprise identifiée par une source",
    passed: sourcesFiables.length > 0,
    detail:
      sourcesFiables.length > 0
        ? `Présente dans : ${sourcesFiables.map((s) => s.label).join(", ")}.`
        : "Aucune source externe : l'existence de l'entreprise n'est pas corroborée.",
  });
  if (sourcesFiables.length === 0) {
    unknowns.push("Aucune source externe ne corrobore l'existence de cette entreprise.");
  }

  // --- 5. MOYEN DE CONTACT ------------------------------------------------
  const aEmail = Boolean(prospect.primaryContactId);
  criteres.push({
    id: "contact",
    label: "Email professionnel vérifié",
    passed: aEmail,
    detail: aEmail
      ? `Adresse retenue : ${prospect.primaryContact?.email}.`
      : "Aucun email fiable trouvé — aucune adresse ne sera devinée.",
  });
  if (aEmail) reasons.push("Un email professionnel publié par l'entreprise a été trouvé.");
  else unknowns.push("Sans email vérifié, aucun contact n'est possible.");

  // --- 6. OPPORTUNITÉ RÉELLE ---------------------------------------------
  const auditFait = prospect.auditStatus === "COMPLETE" || prospect.auditStatus === "INCOMPLETE";
  const problemes = prospect.issues.length;

  if (!auditFait) {
    criteres.push({
      id: "opportunity",
      label: "Opportunité démontrée",
      passed: null,
      detail: "Aucun audit effectué : on ignore s'il y a une opportunité.",
    });
    unknowns.push("Le site n'a pas été audité : l'opportunité n'est ni prouvée ni écartée.");
  } else {
    criteres.push({
      id: "opportunity",
      label: "Opportunité démontrée",
      passed: problemes > 0,
      detail:
        problemes > 0
          ? `${problemes} problème(s) prouvé(s) par une vérification.`
          : "Audit effectué, aucun problème exploitable trouvé.",
    });
    if (problemes > 0) {
      const graves = prospect.issues.filter((i) => i.severity === "HIGH").length;
      reasons.push(
        `${problemes} problème(s) prouvé(s)${graves > 0 ? `, dont ${graves} de gravité élevée` : ""}.`,
      );
    }
  }

  // --- 7. SCORE -----------------------------------------------------------
  if (prospect.overallScore === null) {
    criteres.push({
      id: "score",
      label: `Score ≥ ${policy.minScoreToContact}`,
      passed: null,
      detail: "Score non calculé.",
    });
    unknowns.push("Le score n'a pas été calculé.");
  } else {
    const suffisant = prospect.overallScore >= policy.minScoreToContact;
    criteres.push({
      id: "score",
      label: `Score ≥ ${policy.minScoreToContact}`,
      passed: suffisant,
      detail: `Score global ${prospect.overallScore}/100 (seuil ${policy.minScoreToContact}).`,
    });
    if (suffisant) reasons.push(`Score global ${prospect.overallScore}/100.`);
  }

  // --- VERDICT ------------------------------------------------------------
  //
  // Ordre de décision, volontairement rigide :
  //   1. un blocage → NOT_QUALIFIED, quoi qu'il arrive par ailleurs
  //   2. un critère non satisfait → NOT_QUALIFIED
  //   3. une donnée manquante → NEEDS_HUMAN (on ne suppose pas)
  //   4. tout est satisfait → QUALIFIED
  let verdict: Verdict;
  let summary: string;

  const echecs = criteres.filter((c) => c.passed === false);
  const inconnus = criteres.filter((c) => c.passed === null);

  if (blockers.length > 0) {
    verdict = "NOT_QUALIFIED";
    summary = `Écarté : ${blockers[0]}`;
  } else if (echecs.length > 0) {
    verdict = "NOT_QUALIFIED";
    summary = `Écarté : ${echecs.map((c) => c.label.toLowerCase()).join(", ")} — ${echecs[0].detail}`;
  } else if (inconnus.length > 0) {
    verdict = "NEEDS_HUMAN";
    summary =
      `Impossible de conclure : ${inconnus.length} information(s) manquante(s) ` +
      `(${inconnus.map((c) => c.label.toLowerCase()).join(", ")}). ` +
      `Plutôt que de supposer, l'agent vous laisse trancher.`;
  } else {
    verdict = "QUALIFIED";
    summary = `Retenu : ${reasons.join(" ")}`;
  }

  const qualification: Qualification = { verdict, reasons, blockers, unknowns, criteres, summary };

  if (options.persist !== false) {
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        qualification: verdict,
        qualificationReason: JSON.stringify({ summary, reasons, blockers, unknowns, criteres }),
        qualifiedAt: new Date(),
      },
    });

    await logActivity({
      actor: "AGENT",
      module: "QUALIFICATION",
      action: "qualification.evaluate",
      entityType: "Prospect",
      entityId: prospectId,
      summary: `${prospect.name} — ${verdict} : ${summary}`,
      details: { verdict, reasons, blockers, unknowns },
      level: verdict === "NEEDS_HUMAN" ? "WARN" : "INFO",
    });
  }

  return qualification;
}

/** Qualifie un lot de prospects et renvoie le détail par verdict. */
export async function qualifyMany(prospectIds: string[], policy?: Policy) {
  const resolved = policy ?? (await getPolicy());
  const parVerdict: Record<Verdict, string[]> = {
    QUALIFIED: [], NOT_QUALIFIED: [], NEEDS_HUMAN: [], PENDING: [],
  };
  const details: Array<{ prospectId: string; verdict: Verdict; summary: string }> = [];

  for (const id of prospectIds) {
    const q = await qualifyProspect(id, { policy: resolved });
    parVerdict[q.verdict].push(id);
    details.push({ prospectId: id, verdict: q.verdict, summary: q.summary });
  }

  return { parVerdict, details };
}
