// ---------------------------------------------------------------------------
// COURRIER SYSTÈME — ce qui arrive dans la boîte sans être une réponse
//
// POURQUOI CE FICHIER EXISTE.
//
// Une boîte professionnelle reçoit bien autre chose que des réponses de
// prospects : rapports DMARC quotidiens, accusés d'absence, avis de non-remise,
// notifications de plateformes. Comptés comme « réponses », ils gonflent un
// chiffre qui sert à décider — et surtout ils remontent en « Action requise »,
// où ils noient les vraies réponses commerciales sous du bruit.
//
// Constaté en réel : deux « réponses » signalées, dont un rapport DMARC de
// Google et un inconnu sans rattachement. Aucune des deux n'était une réponse.
//
// CE MODULE NE SUPPRIME RIEN. Il qualifie. Un message reconnu comme système
// reste enregistré, consultable et traçable — il cesse simplement de se faire
// passer pour une réponse de prospect.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export type SystemKind = "DMARC_REPORT" | "BOUNCE" | "AUTO_REPLY" | "SYSTEM" | "NONE";

export type SystemVerdict = {
  kind: SystemKind;
  /** Vrai dès que le message n'est pas une réponse humaine adressée à AMYN. */
  isSystem: boolean;
  /** Ce qui a déclenché la reconnaissance. Toujours relisible. */
  reason: string;
  signals: string[];
};

const AUCUN: SystemVerdict = {
  kind: "NONE",
  isSystem: false,
  reason: "Message ordinaire : aucun marqueur de courrier automatique.",
  signals: [],
};

/** Parties locales qui n'appartiennent jamais à une personne. */
const LOCALES_SYSTEME = [
  "noreply", "no-reply", "donotreply", "do-not-reply", "ne-pas-repondre",
  "mailer-daemon", "maildaemon", "postmaster", "abuse", "bounce", "bounces",
  "notification", "notifications", "alerte", "alerts", "automatic",
  "listserv", "majordomo", "root", "daemon", "cron",
];

function partieLocale(email: string): string {
  return (email.split("@")[0] ?? "").toLowerCase();
}

function lireEntete(
  headers: Record<string, string | undefined> | undefined,
  nom: string,
): string {
  if (!headers) return "";
  const direct = headers[nom] ?? headers[nom.toLowerCase()];
  if (direct) return direct.toLowerCase();
  // Les en-têtes ne sont pas sensibles à la casse : on cherche sans elle.
  const cle = Object.keys(headers).find((k) => k.toLowerCase() === nom.toLowerCase());
  return cle ? (headers[cle] ?? "").toLowerCase() : "";
}

/**
 * Reconnaît un rapport d'agrégation DMARC.
 *
 * Ces rapports arrivent tous les jours, de chaque grand fournisseur, dès que
 * DMARC est configuré avec une adresse `rua`. Ils sont utiles — mais ce sont
 * des rapports techniques, pas des messages.
 */
function estRapportDmarc(input: {
  fromEmail: string;
  subject: string;
  headers?: Record<string, string | undefined>;
}): string[] {
  const signaux: string[] = [];
  const locale = partieLocale(input.fromEmail);
  const sujet = input.subject.toLowerCase();

  if (locale.includes("dmarc")) signaux.push(`expéditeur « ${locale} »`);
  // Format normalisé du sujet : « Report domain: exemple.fr Submitter: ... »
  if (/report\s+domain\s*:/i.test(sujet)) signaux.push("sujet « Report Domain: »");
  if (/\bdmarc\b/i.test(sujet)) signaux.push("sujet mentionnant DMARC");
  if (/aggregate\s+report/i.test(sujet)) signaux.push("sujet « aggregate report »");
  if (lireEntete(input.headers, "X-Report-Type").includes("dmarc")) {
    signaux.push("en-tête X-Report-Type: dmarc");
  }

  return signaux;
}

/** Reconnaît un avis de non-remise. */
function estRebond(input: {
  fromEmail: string;
  subject: string;
  headers?: Record<string, string | undefined>;
}): string[] {
  const signaux: string[] = [];
  const locale = partieLocale(input.fromEmail);
  const sujet = input.subject.toLowerCase();

  if (["mailer-daemon", "maildaemon", "postmaster"].includes(locale)) {
    signaux.push(`expéditeur « ${locale} »`);
  }
  // En-tête normalisé d'un rapport de remise : la preuve la plus fiable.
  if (lireEntete(input.headers, "Content-Type").includes("report-type=delivery-status")) {
    signaux.push("rapport de statut de remise (Content-Type)");
  }
  if (
    /(undelivered mail|delivery status notification|mail delivery (failed|subsystem)|returned to sender|échec de (la )?remise|message non (délivré|remis))/i
      .test(sujet)
  ) {
    signaux.push("sujet d'avis de non-remise");
  }
  return signaux;
}

/** Reconnaît une réponse automatique (absence, accusé de réception). */
function estReponseAutomatique(input: {
  subject: string;
  headers?: Record<string, string | undefined>;
}): string[] {
  const signaux: string[] = [];
  const auto = lireEntete(input.headers, "Auto-Submitted");
  if (auto && auto !== "no") signaux.push(`en-tête Auto-Submitted: ${auto}`);
  if (lireEntete(input.headers, "X-Autoreply")) signaux.push("en-tête X-Autoreply");
  if (lireEntete(input.headers, "X-Autorespond")) signaux.push("en-tête X-Autorespond");

  const precedence = lireEntete(input.headers, "Precedence");
  if (precedence === "auto_reply") signaux.push("en-tête Precedence: auto_reply");

  if (
    /\b(absence du bureau|out of office|réponse automatique|automatic reply|autoreply|vacation|congés annuels|je suis absent)\b/i
      .test(input.subject)
  ) {
    signaux.push("sujet d'absence ou de réponse automatique");
  }
  return signaux;
}

/** Reconnaît une notification de service ou un envoi en masse. */
function estNotification(input: {
  fromEmail: string;
  headers?: Record<string, string | undefined>;
}): string[] {
  const signaux: string[] = [];
  const locale = partieLocale(input.fromEmail);

  const correspond = LOCALES_SYSTEME.find(
    (l) => locale === l || locale.startsWith(`${l}-`) || locale.startsWith(`${l}.`) || locale.startsWith(`${l}+`),
  );
  if (correspond) signaux.push(`expéditeur « ${locale} » (adresse de service)`);

  // Une liste de diffusion s'identifie elle-même. Personne ne « répond » à
  // une liste dans le cadre d'une prospection.
  if (lireEntete(input.headers, "List-Id")) signaux.push("en-tête List-Id (liste de diffusion)");
  if (lireEntete(input.headers, "List-Unsubscribe")) signaux.push("en-tête List-Unsubscribe");
  if (lireEntete(input.headers, "Precedence") === "bulk") signaux.push("en-tête Precedence: bulk");

  return signaux;
}

/**
 * Qualifie un message entrant.
 *
 * L'ORDRE COMPTE. Le rebond est cherché avant la notification générique :
 * `postmaster@` déclenche les deux, et « rebond » est l'information utile —
 * elle entraîne une mise en liste d'opposition, pas la notification.
 */
export function detecterCourrierSysteme(input: {
  fromEmail: string;
  subject: string;
  headers?: Record<string, string | undefined>;
}): SystemVerdict {
  const dmarc = estRapportDmarc(input);
  if (dmarc.length > 0) {
    return {
      kind: "DMARC_REPORT",
      isSystem: true,
      reason: `Rapport DMARC automatique (${dmarc.join(", ")}). Utile, mais ce n'est pas une réponse.`,
      signals: dmarc,
    };
  }

  const rebond = estRebond(input);
  if (rebond.length > 0) {
    return {
      kind: "BOUNCE",
      isSystem: true,
      reason: `Avis de non-remise (${rebond.join(", ")}).`,
      signals: rebond,
    };
  }

  const auto = estReponseAutomatique(input);
  if (auto.length > 0) {
    return {
      kind: "AUTO_REPLY",
      isSystem: true,
      reason: `Réponse automatique (${auto.join(", ")}) : personne ne l'a écrite.`,
      signals: auto,
    };
  }

  const notif = estNotification(input);
  if (notif.length > 0) {
    return {
      kind: "SYSTEM",
      isSystem: true,
      reason: `Message de service (${notif.join(", ")}).`,
      signals: notif,
    };
  }

  return AUCUN;
}

// ---------------------------------------------------------------------------
// RATTRAPAGE DES MESSAGES DÉJÀ ENREGISTRÉS
// ---------------------------------------------------------------------------


export type ReclassementResult = {
  examines: number;
  systeme: number;
  nonRattachees: number;
  inchangees: number;
  details: Array<{ de: string; sujet: string; avant: string; apres: string; motif: string }>;
};

/**
 * Requalifie les réponses déjà en base, sans en supprimer aucune.
 *
 * Les messages ingérés avant l'existence de cette détection ont pu être
 * comptés comme des réponses de prospects — un rapport DMARC quotidien, par
 * exemple. Ce rattrapage les remet à leur place. Il ne touche NI au contenu,
 * NI aux oppositions déjà enregistrées : seulement à la façon dont chaque
 * message est présenté et compté.
 */
export async function reclasserReponses(
  options: { dryRun?: boolean } = {},
): Promise<ReclassementResult> {
  const reponses = await prisma.reply.findMany({
    select: {
      id: true, fromEmail: true, subject: true, reviewStatus: true,
      prospectId: true, matchedBy: true, isSystem: true, classification: true,
    },
    orderBy: { receivedAt: "asc" },
  });

  const bilan: ReclassementResult = {
    examines: reponses.length, systeme: 0, nonRattachees: 0, inchangees: 0, details: [],
  };

  for (const r of reponses) {
    // Les en-têtes n'ont pas été conservés : la requalification s'appuie sur
    // l'expéditeur et le sujet. C'est moins fin qu'à l'ingestion, mais
    // largement suffisant pour un rapport DMARC ou un mailer-daemon.
    const verdict = detecterCourrierSysteme({ fromEmail: r.fromEmail, subject: r.subject });

    const rattachementFiable =
      r.prospectId !== null &&
      ["CONTACT", "SEND_LOG", "CLIENT", "DOMAIN", "MANUAL"].includes(r.matchedBy);

    let nouveauStatut = r.reviewStatus;
    let motif = "";

    if (verdict.isSystem) {
      nouveauStatut = "SYSTEM";
      motif = verdict.reason;
    } else if (!rattachementFiable) {
      nouveauStatut = "UNMATCHED";
      motif = "Expéditeur inconnu : aucun prospect ni envoi ne permet de rattacher ce message.";
    }

    // Une opposition reste une opposition : son état RESOLVED ne bouge pas.
    if (r.classification === "OPT_OUT") {
      bilan.inchangees += 1;
      continue;
    }

    if (nouveauStatut === r.reviewStatus && verdict.isSystem === r.isSystem) {
      bilan.inchangees += 1;
      continue;
    }

    if (!options.dryRun) {
      await prisma.reply.update({
        where: { id: r.id },
        data: {
          reviewStatus: nouveauStatut,
          isSystem: verdict.isSystem,
          systemKind: verdict.isSystem ? verdict.kind : null,
          recommendedAction: verdict.isSystem ? "Aucune action : courrier automatique." : undefined,
        },
      });
    }

    if (nouveauStatut === "SYSTEM") bilan.systeme += 1;
    else if (nouveauStatut === "UNMATCHED") bilan.nonRattachees += 1;

    bilan.details.push({
      de: r.fromEmail,
      sujet: r.subject.slice(0, 60),
      avant: r.reviewStatus,
      apres: nouveauStatut,
      motif,
    });
  }

  if (!options.dryRun && bilan.details.length > 0) {
    await logActivity({
      actor: "SYSTEM",
      module: "REPLIES",
      action: "replies.reclassify",
      summary:
        `${bilan.details.length} message(s) requalifié(s) : ${bilan.systeme} système, ` +
        `${bilan.nonRattachees} non rattaché(s). Aucun message supprimé.`,
      details: { details: bilan.details.slice(0, 20) },
    });
  }

  return bilan;
}
