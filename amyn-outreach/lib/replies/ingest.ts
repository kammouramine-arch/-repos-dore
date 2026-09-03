// ---------------------------------------------------------------------------
// INGESTION D'UNE REPONSE ENTRANTE
//
// Point d'entree unique pour tout email recu, quelle que soit sa provenance
// (IMAP ou saisie manuelle). Enchaine :
//   1. deduplication      — un message deja vu n'est jamais retraite
//   2. classification     — deterministe, tracable
//   3. OPPOSITION D'ABORD — blacklist immediate, avant toute autre suite
//   4. rattachement CRM   — seulement si une trace le prouve
//   5. mise a jour du prospect + historique
//
// CE MODULE N'ENVOIE JAMAIS D'EMAIL. Il ne connait pas le mailer.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { addToSuppressionList } from "@/lib/campaign/compliance";
import { RECOMMENDED_ACTION, type ReplyClass } from "@/lib/constants";
import { classifyReply } from "./classify";
import { matchProspect } from "./match";
import { detecterCourrierSysteme, type SystemKind } from "./system-mail";

export type IngestInput = {
  fromEmail: string;
  fromName?: string | null;
  toEmail?: string | null;
  subject: string;
  body: string;
  receivedAt?: Date;
  messageId?: string | null;
  imapFolder?: string | null;
  imapUid?: number | null;
  source?: "IMAP" | "MANUAL";
  isAutoReply?: boolean;
  /** En-tetes du message, quand la source les fournit. Servent a reconnaitre
   *  un courrier automatique de facon fiable plutot que par son sujet. */
  headers?: Record<string, string | undefined>;
  /**
   * Rattachement impose (saisie manuelle : vous savez de qui vient la reponse).
   * Le rattachement automatique reste calcule, mais celui-ci fait foi.
   */
  forceProspectId?: string;
};

export type IngestOutcome = {
  stored: boolean;
  duplicate: boolean;
  replyId?: string;
  classification: ReplyClass;
  confidence: string;
  recommendedAction: string;
  prospectId: string | null;
  prospectName: string | null;
  matchedBy: string;
  optedOut: boolean;
  /** Le message est-il un courrier automatique plutot qu'une reponse ? */
  isSystem: boolean;
  systemKind: SystemKind;
  /** Compte-t-il comme reponse commerciale ? Rattachement fiable exige. */
  isProspectReply: boolean;
  reviewStatus: string;
  reason: string;
};

/** Statut du prospect induit par le classement. */
const STATUS_BY_CLASS: Record<string, string> = {
  INTERESTED: "INTERESTED",
  PRICE_REQUEST: "INTERESTED",
  MEETING_REQUEST: "MEETING",
  QUESTION: "REPLIED",
  POSITIVE: "REPLIED",
  LATER: "REPLIED",
  NOT_INTERESTED: "LOST",
  NEGATIVE: "REPLIED",
  OPT_OUT: "OPTOUT",
  BOUNCE: "BLOCKED",
  NEEDS_HUMAN: "REPLIED",
  UNKNOWN: "REPLIED",
};

/** Etat de tri initial : ce qui demande une décision arrive en ACTION_REQUIRED. */
const REVIEW_BY_CLASS: Record<string, string> = {
  INTERESTED: "ACTION_REQUIRED",
  PRICE_REQUEST: "ACTION_REQUIRED",
  MEETING_REQUEST: "ACTION_REQUIRED",
  QUESTION: "ACTION_REQUIRED",
  NEEDS_HUMAN: "ACTION_REQUIRED",
  OPT_OUT: "RESOLVED", // la blacklist est la seule suite attendue : rien a faire
  BOUNCE: "RESOLVED",
  NOT_INTERESTED: "REVIEWED",
  NEGATIVE: "REVIEWED",
  POSITIVE: "NEW",
  LATER: "NEW",
  UNKNOWN: "NEW",
};

export async function ingestReply(input: IngestInput): Promise<IngestOutcome> {
  const fromEmail = input.fromEmail.trim().toLowerCase();
  const receivedAt = input.receivedAt ?? new Date();
  const messageId = input.messageId?.trim() || null;

  // --- 1. DEDUPLICATION ----------------------------------------------------
  if (messageId) {
    const existing = await prisma.reply.findUnique({
      where: { messageId },
      select: {
        id: true, classification: true, confidence: true, prospectId: true,
        matchedBy: true, isSystem: true, systemKind: true, reviewStatus: true,
      },
    });
    if (existing) {
      return {
        stored: false,
        duplicate: true,
        replyId: existing.id,
        classification: existing.classification as ReplyClass,
        confidence: existing.confidence,
        recommendedAction: RECOMMENDED_ACTION[existing.classification as ReplyClass] ?? "",
        prospectId: existing.prospectId,
        prospectName: null,
        matchedBy: existing.matchedBy,
        optedOut: existing.classification === "OPT_OUT",
        isSystem: existing.isSystem,
        systemKind: (existing.systemKind as SystemKind | null) ?? "NONE",
        isProspectReply: !existing.isSystem && existing.prospectId !== null,
        reviewStatus: existing.reviewStatus,
        reason: `Message déjà traité (Message-ID ${messageId}). Aucun doublon créé.`,
      };
    }
  }

  // --- 2. COURRIER SYSTÈME OU RÉPONSE HUMAINE ? ---------------------------
  //
  // Cette question se pose AVANT la classification commerciale. Un rapport
  // DMARC contient les mots « report », « fail », « policy » : le classer
  // comme une réponse produit un verdict qui n'a aucun sens, et le fait
  // remonter en « Action requise ».
  const systeme = detecterCourrierSysteme({
    fromEmail,
    subject: input.subject,
    headers: input.headers,
  });

  // --- 3. CLASSIFICATION ---------------------------------------------------
  const classified = classifyReply({ subject: input.subject, body: input.body });

  // Un retour automatique n'est pas une reponse humaine : on ne le laisse pas
  // faire avancer un prospect. Sauf s'il porte une opposition explicite —
  // la protection du destinataire passe avant tout.
  let classification = classified.classification;
  let confidence = classified.confidence;
  let reason = classified.reason;
  if (input.isAutoReply && classification !== "OPT_OUT" && classification !== "BOUNCE") {
    classification = "UNKNOWN";
    confidence = "LOW";
    reason = "Réponse automatique (absence du bureau ou accusé de réception) : non interprétée.";
  }

  // Un courrier système n'exprime aucune intention commerciale : le classer
  // reviendrait à prêter une opinion à une machine.
  //
  // DEUX EXCEPTIONS, et elles vont toutes deux dans le sens de la protection
  // du destinataire : un avis de non-remise reste un BOUNCE — il doit
  // bloquer l'adresse ; une opposition explicite reste une opposition, même
  // si elle arrive dans un message automatique.
  if (systeme.isSystem && classification !== "OPT_OUT") {
    if (systeme.kind === "BOUNCE") {
      classification = "BOUNCE";
      confidence = "HIGH";
      reason = systeme.reason;
    } else {
      classification = "UNKNOWN";
      confidence = "HIGH";
      reason = systeme.reason;
    }
  }

  // --- 3. OPPOSITION — PRIORITAIRE SUR TOUT LE RESTE -----------------------
  // La mise en liste d'opposition a lieu AVANT l'enregistrement et avant toute
  // mise a jour CRM : meme si une etape ulterieure echoue, l'adresse est deja
  // protegee et aucune campagne ne pourra plus l'atteindre.
  let optedOut = false;
  if (classification === "OPT_OUT") {
    await addToSuppressionList({
      email: fromEmail,
      reason: "UNSUBSCRIBED",
      source: input.source === "IMAP" ? "Réponse reçue dans contact@amyn.agency" : "Réponse saisie manuellement",
      notes: reason,
    });
    optedOut = true;
  }

  // --- 4. RATTACHEMENT -----------------------------------------------------
  const auto = await matchProspect(fromEmail);
  const match: typeof auto = input.forceProspectId
    ? {
        prospectId: input.forceProspectId,
        matchedBy: auto.prospectId === input.forceProspectId ? auto.matchedBy : "MANUAL",
        campaignId: auto.campaignId,
        reason:
          auto.prospectId === input.forceProspectId
            ? auto.reason
            : "Prospect indiqué explicitement lors de la saisie.",
      }
    : auto;

  const prospect = match.prospectId
    ? await prisma.prospect.findUnique({ where: { id: match.prospectId } })
    : null;

  if (classification === "BOUNCE") {
    await addToSuppressionList({
      email: fromEmail,
      reason: "BOUNCED",
      source: "Rebond détecté à la lecture de la boîte",
      notes: reason,
    });
    await prisma.sendLog.updateMany({
      where: { toEmail: fromEmail },
      data: { bounceType: "HARD", bounceDetail: input.subject.slice(0, 200) },
    });
  }

  const recommendedAction = systeme.isSystem
    ? "Aucune action : courrier automatique."
    : (RECOMMENDED_ACTION[classification] ?? "À lire.");

  // --- ÉTAT DE TRI ---------------------------------------------------------
  //
  // « Action requise » est réservé à ce qui peut être relié de façon fiable à
  // un prospect ou à un email réellement envoyé. Sans ce rattachement, on ne
  // sait pas de quoi le message parle — le mettre en tête du centre de tri
  // ferait passer une inconnue pour une opportunité.
  //
  // Rien ne disparaît pour autant : chacun de ces états est consultable.
  const rattachementFiable =
    prospect !== null && ["CONTACT", "SEND_LOG", "CLIENT", "DOMAIN", "MANUAL"].includes(match.matchedBy);
  const isProspectReply = !systeme.isSystem && rattachementFiable;

  const reviewStatus = systeme.isSystem
    ? "SYSTEM"
    : !rattachementFiable
      ? "UNMATCHED"
      : (REVIEW_BY_CLASS[classification] ?? "NEW");

  // --- 5. ENREGISTREMENT ---------------------------------------------------
  const reply = await prisma.reply.create({
    data: {
      prospectId: prospect?.id ?? null,
      campaignId: match.campaignId ?? null,
      fromEmail,
      fromName: input.fromName ?? null,
      toEmail: input.toEmail ?? null,
      subject: input.subject,
      body: input.body,
      receivedAt,
      classification,
      confidence,
      matchedSignals: JSON.stringify(classified.matchedSignals),
      recommendedAction,
      matchedBy: match.matchedBy,
      source: input.source ?? "MANUAL",
      messageId,
      imapFolder: input.imapFolder ?? null,
      imapUid: input.imapUid ?? null,
      isSystem: systeme.isSystem,
      systemKind: systeme.isSystem ? systeme.kind : null,
      reviewStatus,
    },
  });

  // --- 6. MISE A JOUR DU PROSPECT -----------------------------------------
  if (prospect) {
    // Un courrier automatique ne fait pas avancer un prospect — sauf s'il
    // porte une opposition ou un rebond, qui doivent au contraire l'arreter.
    const systemeSansConsequence =
      systeme.isSystem && classification !== "OPT_OUT" && classification !== "BOUNCE";
    const newStatus = systemeSansConsequence ? undefined : STATUS_BY_CLASS[classification];
    const advance = newStatus && newStatus !== prospect.status && prospect.status !== "WON";

    await prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        ...(advance ? { status: newStatus } : {}),
        lastInteractionAt: receivedAt,
        nextAction: recommendedAction,
      },
    });

    if (advance) {
      await prisma.statusEvent.create({
        data: {
          prospectId: prospect.id,
          fromStatus: prospect.status,
          toStatus: newStatus,
          reason,
          actor: "SYSTEM",
        },
      });
    }

    // Une reponse arrete toute relance en cours. Un courrier automatique,
    // non : une absence du bureau n'est pas un refus, et interrompre la
    // sequence sur ce motif ferait perdre le prospect sans decision.
    if (!systemeSansConsequence) {
      await prisma.campaignMember.updateMany({
        where: { prospectId: prospect.id, status: { in: ["APPROVED", "SENT", "READY", "PENDING"] } },
        data: { status: "REPLIED", nextSendAt: null },
      });
    }
  }

  await logActivity({
    actor: "SYSTEM",
    module: "REPLIES",
    action: input.source === "IMAP" ? "replies.imap_ingest" : "replies.classify",
    entityType: prospect ? "Prospect" : "Reply",
    entityId: prospect?.id ?? reply.id,
    summary: prospect
      ? `Réponse de ${fromEmail} classée ${classification} (${confidence}) — ${prospect.name}. Action suggérée : ${recommendedAction}.`
      : `Réponse de ${fromEmail} classée ${classification} (${confidence}) — expéditeur inconnu, aucun prospect rattaché.`,
    details: { reason, matchedBy: match.matchedBy, signals: classified.matchedSignals },
    level: classification === "NEEDS_HUMAN" ? "WARN" : "INFO",
  });

  return {
    stored: true,
    duplicate: false,
    replyId: reply.id,
    classification,
    confidence,
    recommendedAction,
    prospectId: prospect?.id ?? null,
    prospectName: prospect?.name ?? null,
    matchedBy: match.matchedBy,
    optedOut,
    isSystem: systeme.isSystem,
    systemKind: systeme.kind,
    isProspectReply,
    reviewStatus,
    reason: `${reason} ${match.reason}`.trim(),
  };
}
