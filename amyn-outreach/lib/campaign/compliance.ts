// ---------------------------------------------------------------------------
// BARRIERE DE CONFORMITE
//
// Aucun email ne part sans passer TOUS ces controles. Un seul echec bloque.
// Le rapport complet est enregistre dans SendLog.complianceReport : on peut
// toujours expliquer pourquoi un envoi a eu lieu, ou pourquoi il a ete refuse.
//
// Fondement : prospection B2B en France. Le message doit etre en rapport avec
// l'activite professionnelle du destinataire, l'identite de l'expediteur doit
// etre claire, l'origine des donnees tracable, et l'opposition simple et
// gratuite. Une personne opposee n'est plus jamais contactee.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { validateEmailSyntax } from "@/lib/contact/discover";
import { verifyEmail, catalogNumbers, numbersFromEvidence } from "@/lib/email/verify";

export type CheckOutcome = { name: string; passed: boolean; detail: string };

export type ComplianceReport = {
  allowed: boolean;
  checks: CheckOutcome[];
  blockedBy: string[];
};

export type SendCandidate = {
  prospectId: string;
  campaignId?: string | null;
  draftId: string;
  step: number;
};

export async function runComplianceChecks(candidate: SendCandidate): Promise<ComplianceReport> {
  const checks: CheckOutcome[] = [];

  const prospect = await prisma.prospect.findUnique({
    where: { id: candidate.prospectId },
    include: {
      primaryContact: true,
      issues: { select: { id: true, summary: true, evidenceSnippet: true, evidenceNote: true } },
    },
  });

  const draft = await prisma.emailDraft.findUnique({ where: { id: candidate.draftId } });

  // --- 1. Le prospect et le brouillon existent ----------------------------
  if (!prospect || !draft) {
    return {
      allowed: false,
      checks: [
        {
          name: "EXISTENCE",
          passed: false,
          detail: "Prospect ou brouillon introuvable.",
        },
      ],
      blockedBy: ["EXISTENCE"],
    };
  }

  // --- 2. Garde-fou données de démonstration ------------------------------
  checks.push({
    name: "DEMO_GUARD",
    passed: !prospect.isDemo,
    detail: prospect.isDemo
      ? "Fiche de démonstration : aucun envoi réel n'est possible, quelles que soient les autres conditions."
      : "Fiche réelle.",
  });

  // --- 3. Contact présent et tracé ----------------------------------------
  const contact = prospect.primaryContact;
  checks.push({
    name: "CHECK_EMAIL_PRESENT",
    passed: Boolean(contact?.email),
    detail: contact?.email
      ? `Adresse retenue : ${contact.email}`
      : "Aucun email public retenu pour ce prospect.",
  });

  checks.push({
    name: "CHECK_SOURCE",
    passed: Boolean(contact?.sourceUrl && contact.discoveryMethod),
    detail: contact?.sourceUrl
      ? `Origine traçable : ${contact.discoveryMethod} — ${contact.sourceUrl}`
      : "Origine de l'adresse non traçable : envoi refusé.",
  });

  // --- 4. Validité de l'adresse -------------------------------------------
  if (contact?.email) {
    const validation = validateEmailSyntax(contact.email);
    checks.push({
      name: "CHECK_EMAIL_VALIDITY",
      passed: validation.status === "SYNTAX_OK",
      detail:
        validation.status === "SYNTAX_OK"
          ? "Syntaxe valide, adresse non technique."
          : `Adresse écartée : ${validation.status} — ${validation.note ?? ""}`,
    });
  } else {
    checks.push({ name: "CHECK_EMAIL_VALIDITY", passed: false, detail: "Pas d'adresse à valider." });
  }

  // --- 5. Liste d'opposition (adresse ET domaine) -------------------------
  if (contact?.email) {
    const domain = contact.email.split("@")[1] ?? "";
    const suppressed = await prisma.suppression.findFirst({
      where: { OR: [{ email: contact.email.toLowerCase() }, { domain: domain.toLowerCase() }] },
    });
    checks.push({
      name: "CHECK_OPT_OUT",
      passed: !suppressed,
      detail: suppressed
        ? `Présent en liste d'opposition (${suppressed.reason}, ajouté le ${suppressed.createdAt.toISOString().slice(0, 10)}). Ne sera jamais recontacté.`
        : "Absent de la liste d'opposition.",
    });
  } else {
    checks.push({ name: "CHECK_OPT_OUT", passed: false, detail: "Pas d'adresse à vérifier." });
  }

  // --- 6. Statut du prospect ----------------------------------------------
  const forbiddenStatuses = ["OPTOUT", "LOST", "WON", "BLOCKED"];
  checks.push({
    name: "CHECK_STATUS",
    passed: !forbiddenStatuses.includes(prospect.status),
    detail: forbiddenStatuses.includes(prospect.status)
      ? `Statut « ${prospect.status} » : le prospect ne doit pas être contacté.`
      : `Statut « ${prospect.status} » compatible avec un envoi.`,
  });

  // --- 7. Doublon : a-t-on déjà écrit ce message ? -------------------------
  const alreadySent = await prisma.sendLog.findFirst({
    where: {
      prospectId: prospect.id,
      sequenceStep: candidate.step,
      status: { in: ["SENT", "SIMULATED"] },
      ...(candidate.campaignId ? { campaignId: candidate.campaignId } : {}),
    },
  });
  checks.push({
    name: "CHECK_DUPLICATE",
    passed: !alreadySent,
    detail: alreadySent
      ? `Message déjà envoyé à l'étape ${candidate.step} le ${alreadySent.createdAt.toISOString()}.`
      : `Aucun envoi précédent à l'étape ${candidate.step}.`,
  });

  // --- 8. Pertinence : le message repose-t-il sur des preuves ? -----------
  const cited: string[] = JSON.parse(draft.citedIssueIds || "[]");
  const knownIds = prospect.issues.map((i) => i.id);
  const allCitedExist = cited.length > 0 && cited.every((id) => knownIds.includes(id));
  checks.push({
    name: "CHECK_RELEVANCE",
    passed: allCitedExist,
    detail: allCitedExist
      ? `Le message s'appuie sur ${cited.length} problème(s) prouvé(s) et enregistré(s).`
      : "Le message cite des problèmes absents de la base de preuves.",
  });

  // --- 9. Verification anti-invention, REJOUEE sur le corps reel ----------
  // On ne fait pas confiance au drapeau enregistre a la generation : le corps
  // a pu etre modifie depuis. La verification est refaite maintenant.
  const recheck = verifyEmail({
    subject: draft.subject,
    body: draft.body,
    citedIssueIds: cited,
    knownIssueIds: knownIds,
    allowedNumbers: [
      ...catalogNumbers(),
      ...numbersFromEvidence(
        prospect.issues.flatMap((i) => [i.summary, i.evidenceSnippet, i.evidenceNote]),
      ),
    ],
    companyName: prospect.name,
    senderEmail: config.from.email,
  });
  const contentOk = draft.verificationPassed && recheck.passed;
  checks.push({
    name: "CHECK_CONTENT",
    passed: contentOk,
    detail: contentOk
      ? "Contenu revérifié à l'instant : aucune promesse, aucun chiffre non justifié, aucun problème non prouvé."
      : !draft.verificationPassed
        ? `Brouillon refusé à la génération : ${draft.verificationNotes ?? "vérification échouée"}`
        : `Contenu refusé à la revérification : ${recheck.problems.join(" | ")}`,
  });

  // --- 10. Approbation humaine --------------------------------------------
  checks.push({
    name: "CHECK_APPROVAL",
    passed: Boolean(draft.approvedAt),
    detail: draft.approvedAt
      ? `Approuvé le ${draft.approvedAt.toISOString()} par ${draft.approvedBy ?? "inconnu"}.`
      : "En attente d'approbation manuelle.",
  });

  // --- 11. Campagne active -------------------------------------------------
  if (candidate.campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: candidate.campaignId } });
    checks.push({
      name: "CHECK_CAMPAIGN",
      passed: Boolean(campaign && ["READY", "RUNNING"].includes(campaign.status)),
      detail: campaign
        ? `Campagne « ${campaign.name} » au statut ${campaign.status}.`
        : "Campagne introuvable.",
    });
  } else {
    checks.push({ name: "CHECK_CAMPAIGN", passed: true, detail: "Envoi hors campagne." });
  }

  // --- 12. Limites de cadence ---------------------------------------------
  const rate = await checkRateLimit(candidate.campaignId ?? undefined);
  checks.push(rate);

  // --- 13. Fenetre horaire -------------------------------------------------
  const { getPolicy: lirePolitique, checkSendWindow } = await import("@/lib/policy");
  const politique = await lirePolitique();
  const fenetre = checkSendWindow(politique);
  // En simulation, rien ne quitte la machine : la fenetre n'a donc pas a
  // bloquer, sinon on ne pourrait pas tester hors horaires ouvrables. Le
  // controle reste affiche et dit ce qu'il ferait en envoi reel.
  const fenetreBloque = !fenetre.open && !config.dryRun;
  checks.push({
    name: "CHECK_SEND_WINDOW",
    passed: !fenetreBloque,
    detail: fenetre.open
      ? fenetre.reason
      : config.dryRun
        ? `${fenetre.reason} (simulation : non bloquant, mais un envoi réel serait refusé)`
        : `${fenetre.reason}${fenetre.nextOpening ? ` Prochaine ouverture : ${fenetre.nextOpening.toLocaleString("fr-FR")}.` : ""}`,
  });

  const blockedBy = checks.filter((c) => !c.passed).map((c) => c.name);
  return { allowed: blockedBy.length === 0, checks, blockedBy };
}

/**
 * Plafond quotidien + delai minimum entre deux envois.
 *
 * La politique centralisee fait foi. Une campagne peut RESTREINDRE davantage
 * (plafond plus bas, delai plus long) mais jamais assouplir : on retient donc
 * toujours la valeur la plus prudente des deux.
 */
export async function checkRateLimit(campaignId?: string): Promise<CheckOutcome> {
  const { getPolicy } = await import("@/lib/policy");
  const policy = await getPolicy();

  const campaign = campaignId
    ? await prisma.campaign.findUnique({ where: { id: campaignId } })
    : null;

  const dailyLimit = Math.min(policy.dailyLimit, campaign?.dailyLimit ?? policy.dailyLimit);
  const minDelay = Math.max(policy.minDelaySeconds, campaign?.minDelaySeconds ?? 0);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Seuls les envois REELS comptent : ce sont eux qui engagent la reputation
  // du domaine. Une simulation ne consomme pas le quota du jour, sinon une
  // demonstration bloquerait le pilote reel pendant 24 h.
  const sentToday = await prisma.sendLog.count({
    where: { createdAt: { gte: since }, status: "SENT" },
  });

  if (sentToday >= dailyLimit) {
    return {
      name: "CHECK_RATE_LIMIT",
      passed: false,
      detail: `Plafond quotidien atteint : ${sentToday}/${dailyLimit} envois réels sur 24 h.`,
    };
  }

  const last = await prisma.sendLog.findFirst({
    where: { status: "SENT" },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
    if (elapsed < minDelay) {
      return {
        name: "CHECK_RATE_LIMIT",
        passed: false,
        detail: `Délai minimum non respecté : ${Math.round(elapsed)} s écoulées sur ${minDelay} s requises.`,
      };
    }
  }

  return {
    name: "CHECK_RATE_LIMIT",
    passed: true,
    detail: `${sentToday}/${dailyLimit} envois sur 24 h, délai minimum ${minDelay} s respecté.`,
  };
}

/** Ajoute une adresse ou un domaine a la liste d'opposition. Definitif. */
export async function addToSuppressionList(input: {
  email?: string;
  domain?: string;
  reason: string;
  source?: string;
  campaignId?: string;
  notes?: string;
}) {
  const email = input.email?.toLowerCase().trim();
  const domain = input.domain?.toLowerCase().trim();
  if (!email && !domain) throw new Error("Une adresse ou un domaine est requis.");

  const existing = await prisma.suppression.findFirst({
    where: { OR: [...(email ? [{ email }] : []), ...(domain ? [{ domain }] : [])] },
  });
  if (existing) return existing;

  const record = await prisma.suppression.create({
    data: {
      email: email ?? null,
      domain: domain ?? null,
      reason: input.reason,
      source: input.source,
      campaignId: input.campaignId,
      notes: input.notes,
    },
  });

  // Le prospect correspondant passe en OPTOUT et n'avancera plus jamais.
  if (email) {
    const contacts = await prisma.contact.findMany({ where: { email }, select: { prospectId: true } });
    for (const c of contacts) {
      const current = await prisma.prospect.findUnique({ where: { id: c.prospectId } });
      if (!current || current.status === "OPTOUT") continue;
      await prisma.prospect.update({
        where: { id: c.prospectId },
        data: { status: "OPTOUT", blockedReason: `Opposition enregistrée (${input.reason}).` },
      });
      await prisma.statusEvent.create({
        data: {
          prospectId: c.prospectId,
          fromStatus: current.status,
          toStatus: "OPTOUT",
          reason: `Ajouté à la liste d'opposition : ${input.reason}`,
          actor: "SYSTEM",
        },
      });
    }
  }

  return record;
}
