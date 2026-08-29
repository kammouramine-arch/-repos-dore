// ---------------------------------------------------------------------------
// PILOTE AUTOMATIQUE — l'envoi sans relecture email par email
//
// CE QUE CE MODULE CHANGE, ET CE QU'IL NE CHANGE PAS.
//
// Il change UNE chose : plus personne ne lit le texte avant qu'il ne parte.
// C'est un vrai changement, pas un réglage de confort — c'était le dernier
// moment où une erreur pouvait être rattrapée à la main.
//
// Il ne change RIEN d'autre. Opposition, blacklist, cooldown, anti-doublon,
// anti-invention, provenance des informations, plafond quotidien, délai entre
// envois, fenêtre horaire, limite de relances, journalisation : tout reste, et
// tout s'applique email par email, exactement comme avant. Un prospect
// NEEDS_HUMAN n'est jamais envoyé automatiquement — c'est la définition même
// de cet état.
//
// TROIS PROTECTIONS PROPRES À L'AUTOMATISME
//
//   1. UN SAS D'ENTRÉE. Avant le premier envoi d'une exécution, la
//      délivrabilité, la configuration SMTP et la cohérence générale sont
//      vérifiées. Sans DKIM, l'automatisme refuse de démarrer : une campagne
//      qui s'auto-alimente amplifie ce défaut à chaque message et abîme
//      durablement la réputation du domaine.
//
//   2. UN COUPE-CIRCUIT. Après N échecs consécutifs, l'envoi automatique se
//      DÉSACTIVE lui-même et vous prévient. Sans cela, un serveur SMTP en
//      panne produirait des centaines de tentatives avant que quiconque
//      s'en aperçoive.
//
//   3. UNE TRACE DISTINCTE. Un email parti seul est enregistré
//      `approvedBy: "AUTOPILOT"`. On peut donc toujours dire, après coup,
//      lesquels un humain a lus et lesquels la machine a envoyés seule.
//      L'écriture de `approvedAt` reste au même endroit unique du code.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { logActivity } from "@/lib/activity";
import {
  getPolicy, setPolicy, checkSendWindow, remainingToday, type Policy,
} from "@/lib/policy";
import { checkDeliverability, type DeliverabilityReport } from "@/lib/deliverability";
import { mailerStatus } from "@/lib/mailer";
import { preflight } from "@/lib/launch/preflight";
import { isPersonalMailbox } from "@/lib/contact/discover";
import { sendOne } from "./send";
import { approveCampaignMembers, createCampaign, addProspectsToCampaign } from "./index";

export type PorteCheck = { id: string; label: string; ok: boolean; detail: string };

export type AutopilotGate = {
  autorise: boolean;
  checks: PorteCheck[];
  blockers: string[];
  /** Ce qu'il faut faire pour lever chaque blocage. */
  remedes: string[];
};

/**
 * Le sas d'entrée. Répond à une seule question : peut-on laisser partir des
 * emails sans relecture, maintenant, sur cette configuration ?
 *
 * En simulation, la délivrabilité est CONSTATÉE mais ne bloque pas : c'est
 * précisément le moment où l'on veut voir tourner le mécanisme.
 */
export type GateOptions = {
  policy?: Policy;
  now?: Date;
  /** Sauter la vérification DNS. Les blocages liés à la délivrabilité sont alors absents. */
  verifierDns?: boolean;
  /** Injectable : les tests vérifient le raisonnement sans interroger le DNS. */
  deliverabilite?: (domaine: string) => Promise<DeliverabilityReport>;
};

export async function autopilotGate(options: GateOptions = {}): Promise<AutopilotGate> {
  const policy = options.policy ?? (await getPolicy());
  const now = options.now ?? new Date();
  const checks: PorteCheck[] = [];
  const remedes: string[] = [];

  // 1. L'automatisme est-il armé ? Jamais par défaut.
  checks.push({
    id: "arme",
    label: "Envoi automatique activé",
    ok: policy.autoSendEnabled,
    detail: policy.autoSendEnabled
      ? "Activé explicitement."
      : "Désactivé. Les emails qualifiés attendent votre relecture.",
  });
  if (!policy.autoSendEnabled) {
    remedes.push("npm run amyn -- policy autoSendEnabled true");
  }

  // 2. Cohérence générale.
  const check = await preflight();
  checks.push({
    id: "preflight",
    label: "Cohérence de la configuration",
    ok: check.coherent,
    detail: check.summary,
  });
  if (!check.coherent) remedes.push("npm run amyn -- preflight");

  // 3. Transport.
  const mailer = mailerStatus();
  const transportPret = mailer.canDeliver && mailer.smtpConfigured;
  checks.push({
    id: "smtp",
    label: "Transport configuré",
    ok: config.dryRun || transportPret,
    detail: config.dryRun
      ? "Mode simulation : aucun email ne partira réellement."
      : transportPret
        ? `Transport ${mailer.transport} prêt (${mailer.smtpHost ?? "hôte non précisé"}).`
        : `Transport incomplet : ${mailer.smtpMissing.join(", ") || "configuration absente"}.`,
  });
  if (!config.dryRun && !transportPret) remedes.push("npm run amyn -- smtp-check");

  // 4. Délivrabilité — le point qui décide vraiment.
  if (options.verifierDns !== false) {
    const domaine = config.from.email.split("@")[1] ?? "";
    const dns = await (options.deliverabilite ?? checkDeliverability)(domaine);
    const parId = new Map(dns.checks.map((c) => [c.id, c]));

    for (const id of ["mx", "spf", "dmarc"] as const) {
      const c = parId.get(id);
      checks.push({
        id,
        label: c?.label ?? id.toUpperCase(),
        ok: c?.status === "OK",
        detail: c?.detail ?? "Non vérifié.",
      });
    }

    const dkim = parId.get("dkim");
    const dkimOk = dkim?.status === "OK";
    // Sans DKIM, l'automatisme est refusé — sauf si le verrou a été levé
    // volontairement. En simulation, on constate sans bloquer.
    const dkimBloquant = policy.autoSendRequiresDkim && !config.dryRun;
    checks.push({
      id: "dkim",
      label: "DKIM",
      ok: dkimOk || !dkimBloquant,
      detail: dkimOk
        ? (dkim?.detail ?? "Signature active.")
        : dkimBloquant
          ? `${dkim?.detail ?? "Absent."} L'envoi automatique est refusé tant que la signature manque.`
          : `${dkim?.detail ?? "Absent."} Constaté sans bloquer (${config.dryRun ? "mode simulation" : "verrou levé"}).`,
    });
    if (!dkimOk && dkimBloquant) {
      remedes.push(
        "Activer DKIM chez OVHcloud : espace client → Emails → onglet DKIM → activer. " +
          "Puis vérifier : npm run amyn -- dns",
      );
    }
  }

  // 5. Fenêtre horaire et quota — mêmes règles que l'envoi manuel.
  const fenetre = checkSendWindow(policy, now);
  checks.push({
    id: "fenetre",
    label: "Fenêtre d'envoi",
    ok: fenetre.open,
    detail: fenetre.reason,
  });

  const quota = await remainingToday(policy);
  checks.push({
    id: "quota",
    label: "Plafond quotidien",
    ok: quota.remaining > 0,
    detail: `${quota.used}/${policy.dailyLimit} utilisé(s) aujourd'hui, ${quota.remaining} restant(s).`,
  });

  const blockers = checks.filter((c) => !c.ok).map((c) => `${c.label} : ${c.detail}`);
  return { autorise: blockers.length === 0, checks, blockers, remedes };
}

export type AutopilotResult = {
  /** L'exécution a-t-elle pu commencer ? */
  demarre: boolean;
  gate: AutopilotGate;
  examines: number;
  envoyes: number;
  simules: number;
  bloques: number;
  echecs: number;
  /** Motifs de blocage, regroupés. */
  motifs: Record<string, number>;
  details: Array<{ nom: string; issue: string }>;
  /** Le coupe-circuit s'est-il déclenché ? */
  coupeCircuit: boolean;
  summary: string;
};

/**
 * Une exécution du pilote automatique.
 *
 * Bornée par construction : `autoSendMaxPerRun`, le plafond quotidien et le
 * délai minimum entre deux envois s'appliquent tous. Un tour ne peut pas
 * s'emballer.
 */
export async function runAutopilot(
  options: GateOptions & {
    max?: number;
    /** Injectable : les tests n'attendent pas réellement le délai entre envois. */
    attendre?: (ms: number) => Promise<void>;
    /**
     * Injectable : le coupe-circuit est la protection la plus importante de ce
     * module. Sans moyen de provoquer des échecs, il ne serait jamais éprouvé —
     * or une protection non testée n'est qu'une intention.
     */
    envoyer?: typeof sendOne;
  } = {},
): Promise<AutopilotResult> {
  const policy = await getPolicy();
  const now = options.now ?? new Date();
  const attendre = options.attendre ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const envoyer = options.envoyer ?? sendOne;

  const gate = await autopilotGate({
    policy, now,
    verifierDns: options.verifierDns,
    deliverabilite: options.deliverabilite,
  });

  const vide: AutopilotResult = {
    demarre: false, gate, examines: 0, envoyes: 0, simules: 0, bloques: 0, echecs: 0,
    motifs: {}, details: [], coupeCircuit: false,
    summary: `Envoi automatique non autorisé : ${gate.blockers.join(" | ")}`,
  };
  if (!gate.autorise) {
    await logActivity({
      actor: "SYSTEM", module: "SEND", action: "autopilot.refused",
      summary: vide.summary, details: { blockers: gate.blockers }, level: "WARN",
    });
    return vide;
  }

  const quota = await remainingToday(policy);
  const plafond = Math.min(options.max ?? policy.autoSendMaxPerRun, quota.remaining);

  // Les candidats : qualifiés, email rédigé et vérifié, jamais NEEDS_HUMAN,
  // jamais opposés, jamais déjà contactés. Les contrôles complets tournent
  // ensuite pour CHACUN — cette requête ne fait qu'éviter de les convoquer
  // pour rien.
  const candidats = await prisma.prospect.findMany({
    where: {
      isDemo: false,
      qualification: "QUALIFIED",
      status: { notIn: ["OPTOUT", "BLOCKED", "WON", "LOST", "CONTACTED"] },
      primaryContactId: { not: null },
      emailDrafts: { some: { isActive: true, verificationPassed: true } },
    },
    select: {
      id: true, name: true,
      primaryContact: { select: { email: true } },
      emailDrafts: {
        where: { isActive: true, verificationPassed: true },
        select: { id: true, sequenceStep: true },
        take: 1,
      },
    },
    orderBy: [{ overallScore: "desc" }, { createdAt: "asc" }],
    // On en demande plus que le plafond : certains seront ecartes juste
    // apres, et on veut pouvoir remplir le quota malgre ces retraits.
    take: plafond * 3,
  });

  // ADRESSES PERSONNELLES : ecartees de l'envoi AUTOMATIQUE.
  //
  // Une adresse nominative sur une messagerie grand public — orange.fr,
  // gmail.com — est la boite personnelle d'un artisan, pas l'accueil d'une
  // entreprise. Y ecrire sans qu'un humain l'ait decide est exactement le
  // genre de sollicitation qui se retourne contre l'expediteur. Le prospect
  // n'est pas perdu : il reste qualifie et disponible pour un envoi manuel,
  // ou vous jugez au cas par cas.
  const retenus: typeof candidats = [];
  const ecartesPersonnels: string[] = [];
  for (const c of candidats) {
    const email = c.primaryContact?.email;
    if (email && isPersonalMailbox(email)) {
      ecartesPersonnels.push(c.name);
      continue;
    }
    retenus.push(c);
    if (retenus.length >= plafond) break;
  }

  const resultat: AutopilotResult = {
    demarre: true, gate, examines: retenus.length,
    envoyes: 0, simules: 0, bloques: 0, echecs: 0,
    motifs: {}, details: [], coupeCircuit: false, summary: "",
  };

  if (ecartesPersonnels.length > 0) {
    resultat.motifs["adresse personnelle (messagerie grand public)"] = ecartesPersonnels.length;
    for (const nom of ecartesPersonnels.slice(0, 20)) {
      noter(resultat, nom, "écarté de l'envoi automatique — adresse personnelle, à décider à la main");
    }
  }

  if (retenus.length === 0) {
    resultat.summary =
      ecartesPersonnels.length > 0
        ? `Aucun envoi : ${ecartesPersonnels.length} prospect(s) qualifié(s) n'ont qu'une adresse personnelle, ` +
          `réservée à une décision humaine.`
        : "Aucun prospect qualifié en attente d'envoi.";
    return resultat;
  }

  // Une campagne porte les envois automatiques du jour : ils restent
  // regroupés, relisibles et rattachables à une décision.
  const jour = now.toISOString().slice(0, 10);
  const nomCampagne = `Envoi automatique — ${jour}`;
  const campagne =
    (await prisma.campaign.findFirst({ where: { name: nomCampagne } })) ??
    (await createCampaign({
      name: nomCampagne,
      targetCriteria: { mode: "autopilot", qualification: "QUALIFIED" },
    }));

  await addProspectsToCampaign(campagne.id, retenus.map((c) => c.id));

  // La campagne doit etre ACTIVE pour que l'envoi soit autorise — exactement
  // comme pour un envoi manuel. Sans cela, CHECK_CAMPAIGN refuse chaque
  // message, et il a raison : un envoi rattache a une campagne au brouillon
  // n'a pas ete decide.
  await prisma.campaign.update({
    where: { id: campagne.id },
    data: { status: "RUNNING", startedAt: campagne.startedAt ?? now },
  });

  let echecsConsecutifs = 0;
  let premier = true;

  for (const prospect of retenus) {
    const draft = prospect.emailDrafts[0];
    if (!draft) {
      resultat.bloques += 1;
      noter(resultat, prospect.name, "aucun brouillon actif vérifié");
      continue;
    }

    // Délai entre deux envois : le premier part tout de suite, les suivants
    // attendent. C'est ce qui distingue une prospection d'une rafale.
    if (!premier && policy.minDelaySeconds > 0) {
      await attendre(policy.minDelaySeconds * 1000);
    }
    premier = false;

    // Approbation automatique — par le MÊME point d'écriture que
    // l'approbation humaine, avec un auteur distinct. La trace dit toujours
    // qui a décidé.
    await prisma.campaignMember.updateMany({
      where: { campaignId: campagne.id, prospectId: prospect.id, status: { in: ["PENDING", "READY"] } },
      data: { status: "READY" },
    });
    await approveCampaignMembers(campagne.id, "AUTOPILOT");

    const outcome = await envoyer({
      prospectId: prospect.id,
      campaignId: campagne.id,
      draftId: draft.id,
      step: draft.sequenceStep,
    });

    if (outcome.sent) {
      resultat.envoyes += 1;
      echecsConsecutifs = 0;
      noter(resultat, prospect.name, "envoyé");
    } else if (outcome.simulated) {
      resultat.simules += 1;
      echecsConsecutifs = 0;
      noter(resultat, prospect.name, "simulé (DRY_RUN)");
    } else if (outcome.blocked) {
      resultat.bloques += 1;
      const motif = outcome.compliance.blockedBy.join(", ") || (outcome.reason ?? "refusé");
      resultat.motifs[motif] = (resultat.motifs[motif] ?? 0) + 1;
      noter(resultat, prospect.name, `bloqué — ${motif}`);
      // Un refus de conformité n'est PAS une panne : c'est le système qui
      // fonctionne. Il ne compte pas dans le coupe-circuit.
    } else {
      resultat.echecs += 1;
      echecsConsecutifs += 1;
      noter(resultat, prospect.name, `échec — ${outcome.reason ?? "cause inconnue"}`);

      if (echecsConsecutifs >= policy.autoSendMaxConsecutiveFailures) {
        resultat.coupeCircuit = true;
        await setPolicy("autoSendEnabled", false);
        await logActivity({
          actor: "SYSTEM", module: "SEND", action: "autopilot.circuit_breaker",
          summary:
            `Coupe-circuit : ${echecsConsecutifs} échecs consécutifs. ` +
            `L'envoi automatique est DÉSACTIVÉ jusqu'à votre intervention.`,
          details: { echecs: resultat.details.slice(-5) },
          level: "ERROR",
        });
        break;
      }
    }
  }

  resultat.summary =
    `${resultat.examines} prospect(s) examiné(s) : ${resultat.envoyes} envoyé(s), ` +
    `${resultat.simules} simulé(s), ${resultat.bloques} bloqué(s), ${resultat.echecs} en échec.` +
    (resultat.coupeCircuit
      ? " COUPE-CIRCUIT DÉCLENCHÉ : envoi automatique désactivé."
      : "");

  await logActivity({
    actor: "AGENT", module: "SEND", action: "autopilot.run",
    entityType: "Campaign", entityId: campagne.id,
    summary: resultat.summary,
    details: {
      envoyes: resultat.envoyes, simules: resultat.simules,
      bloques: resultat.bloques, echecs: resultat.echecs,
      motifs: resultat.motifs, coupeCircuit: resultat.coupeCircuit,
    },
    level: resultat.coupeCircuit ? "ERROR" : "INFO",
  });

  return resultat;
}

function noter(r: AutopilotResult, nom: string, issue: string) {
  if (r.details.length < 50) r.details.push({ nom, issue });
}
