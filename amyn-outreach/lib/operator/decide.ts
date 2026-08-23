// ---------------------------------------------------------------------------
// DÉCISION — que faire d'une réponse reçue ?
//
// Cœur du dispositif de sécurité. Entièrement DÉTERMINISTE : aucun appel à un
// modèle, aucune part de hasard. Le même message donne toujours la même
// décision, et on peut toujours dire pourquoi.
//
// TROIS INTERDITS QUE RIEN NE PEUT CONTOURNER :
//   1. OPT_OUT ou liste d'opposition → aucune réponse commerciale, jamais.
//   2. Cas incertain ou sensible → intervention humaine, jamais d'automatisme.
//   3. Réponse rédigée → n'est envoyée que si la politique l'autorise ET que
//      la vérification anti-invention est passée.
//
// Ce module DÉCIDE ; il n'exécute rien et n'envoie rien.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getPolicy, type Policy } from "@/lib/policy";
import { RECOMMENDED_ACTION, type ReplyClass } from "@/lib/constants";
import { KIND_BY_CLASS } from "@/lib/email/replies";

export type DecisionAction =
  | "REPLY"              // rédiger une réponse
  | "SCHEDULE_FOLLOWUP"  // reprogrammer un contact plus tard
  | "STOP_SEQUENCE"      // arrêter la prospection, sans blacklist
  | "BLACKLIST"          // opposition : plus aucun contact, jamais
  | "HUMAN_REVIEW"       // vous devez lire
  | "NONE";              // rien à faire

export type Decision = {
  action: DecisionAction;
  /** L'action peut-elle s'exécuter sans validation humaine ? */
  autoAllowed: boolean;
  /** Pourquoi cette décision. Toujours rempli. */
  reason: string;
  /** Libellé affiché à l'humain. */
  recommendation: string;
  /** Ce qui a empêché l'automatisation, s'il y a lieu. */
  gates: string[];
};

/**
 * Classements considérés comme SENSIBLES : ils touchent au droit, à la
 * réputation ou à une contestation. Jamais d'automatisme, quelle que soit la
 * configuration.
 */
const SENSIBLES: ReplyClass[] = ["NEEDS_HUMAN", "UNKNOWN"];

/** Classements pour lesquels une réponse commerciale a du sens. */
const REPONDABLES: ReplyClass[] = [
  "INTERESTED", "PRICE_REQUEST", "MEETING_REQUEST", "QUESTION", "POSITIVE",
];

export async function decideOnReply(
  replyId: string,
  options: { policy?: Policy; persist?: boolean } = {},
): Promise<Decision> {
  const policy = options.policy ?? (await getPolicy());

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: { prospect: { select: { id: true, name: true, status: true } } },
  });
  if (!reply) throw new Error(`Réponse introuvable : ${replyId}`);

  const classification = reply.classification as ReplyClass;
  const gates: string[] = [];
  let decision: Decision;

  // === 0. REBOND ==========================================================
  // Traité avant la liste d'opposition : l'ingestion y a déjà inscrit
  // l'adresse, ce qui masquerait sinon la nature réelle du message.
  if (classification === "BOUNCE") {
    decision = {
      action: "STOP_SEQUENCE",
      autoAllowed: true,
      reason: "Adresse invalide : poursuivre ne ferait qu'abîmer la réputation du domaine.",
      recommendation: RECOMMENDED_ACTION.BOUNCE,
      gates: [],
    };
    return finalise(reply.id, decision, options.persist !== false, reply.prospect?.name);
  }

  // === 1. OPPOSITION — PRIORITÉ ABSOLUE ===================================
  // Vérifiée AVANT tout le reste et indépendamment du classement : si
  // l'adresse est en liste d'opposition pour n'importe quelle raison, aucune
  // réponse commerciale ne peut être envisagée.
  const opposition = await prisma.suppression.findFirst({
    where: {
      OR: [
        { email: reply.fromEmail },
        { domain: reply.fromEmail.split("@")[1] ?? "___" },
      ],
    },
  });

  if (classification === "OPT_OUT" || opposition) {
    decision = {
      action: "BLACKLIST",
      autoAllowed: true, // « ne rien envoyer » est toujours autorisé
      reason:
        classification === "OPT_OUT"
          ? "Le prospect demande à ne plus être contacté. Aucune réponse commerciale ne sera rédigée."
          : `Adresse en liste d'opposition (${opposition?.reason}). Aucune réponse commerciale possible.`,
      recommendation: RECOMMENDED_ACTION.OPT_OUT,
      gates: ["Opposition : aucune réponse commerciale, aucune relance, définitivement."],
    };
    return finalise(reply.id, decision, options.persist !== false, reply.prospect?.name);
  }

  // === 3. CAS SENSIBLE OU INCERTAIN → HUMAIN ==============================
  if (SENSIBLES.includes(classification)) {
    decision = {
      action: "HUMAN_REVIEW",
      autoAllowed: false,
      reason:
        classification === "NEEDS_HUMAN"
          ? "Message ambigu ou sensible : l'agent refuse de trancher à votre place."
          : "Aucune expression reconnue : le message n'a pas été interprété.",
      recommendation: RECOMMENDED_ACTION[classification],
      gates: ["Cas incertain : jamais d'automatisme."],
    };
    return finalise(reply.id, decision, options.persist !== false, reply.prospect?.name);
  }

  // === 4. EXPÉDITEUR NON RATTACHÉ → HUMAIN ================================
  if (!reply.prospect) {
    decision = {
      action: "HUMAN_REVIEW",
      autoAllowed: false,
      reason:
        "Expéditeur inconnu : aucune trace de cette adresse. Répondre supposerait de deviner à qui l'on parle.",
      recommendation: "Identifier l'expéditeur avant toute réponse",
      gates: ["Aucun prospect rattaché : impossible de personnaliser sans inventer."],
    };
    return finalise(reply.id, decision, options.persist !== false, null);
  }

  // === 5. REFUS ==========================================================
  if (classification === "NOT_INTERESTED" || classification === "NEGATIVE") {
    decision = {
      action: "STOP_SEQUENCE",
      autoAllowed: true,
      reason: "Le prospect n'est pas intéressé : la séquence s'arrête, sans insister.",
      recommendation: RECOMMENDED_ACTION[classification],
      gates: [],
    };
    return finalise(reply.id, decision, options.persist !== false, reply.prospect.name);
  }

  // === 6. REPORT =========================================================
  if (classification === "LATER") {
    decision = {
      action: "SCHEDULE_FOLLOWUP",
      autoAllowed: false,
      reason: "Le prospect demande à être recontacté plus tard, sans date exploitable en base.",
      recommendation: RECOMMENDED_ACTION.LATER,
      gates: ["Aucune date n'a été extraite : la reprogrammation est laissée à votre appréciation."],
    };
    return finalise(reply.id, decision, options.persist !== false, reply.prospect.name);
  }

  // === 7. CAS RÉPONDABLE =================================================
  if (REPONDABLES.includes(classification)) {
    if (!KIND_BY_CLASS[classification]) {
      gates.push("Aucun modèle de message ne couvre ce classement.");
    }
    if (!policy.autoReplyEnabled) {
      gates.push("La réponse automatique est désactivée dans la politique d'envoi.");
    }
    if (reply.confidence !== "HIGH") {
      gates.push(`Confiance ${reply.confidence.toLowerCase()} : en dessous de HIGH, on ne répond pas seul.`);
    }

    decision = {
      action: "REPLY",
      autoAllowed: gates.length === 0,
      reason:
        gates.length === 0
          ? "Cas net et couvert par un modèle : une réponse peut être rédigée puis envoyée."
          : "Une réponse peut être rédigée, mais elle attendra votre validation.",
      recommendation: RECOMMENDED_ACTION[classification],
      gates,
    };
    return finalise(reply.id, decision, options.persist !== false, reply.prospect.name);
  }

  // === 8. FILET ==========================================================
  // Un classement non prévu ici ne doit JAMAIS tomber dans un automatisme.
  decision = {
    action: "HUMAN_REVIEW",
    autoAllowed: false,
    reason: `Classement « ${classification} » non couvert par une règle de décision.`,
    recommendation: "Intervention humaine requise",
    gates: ["Aucune règle ne couvre ce cas : refus d'improviser."],
  };
  return finalise(reply.id, decision, options.persist !== false, reply.prospect?.name);
}

async function finalise(
  replyId: string,
  decision: Decision,
  persist: boolean,
  prospectName: string | null | undefined,
): Promise<Decision> {
  if (!persist) return decision;

  await prisma.reply.update({
    where: { id: replyId },
    data: {
      decisionAction: decision.action,
      decisionAuto: decision.autoAllowed,
      decisionReason: decision.reason,
      recommendedAction: decision.recommendation,
      // Un cas qui demande une lecture humaine remonte en tête du centre de tri.
      ...(decision.action === "HUMAN_REVIEW" ? { reviewStatus: "ACTION_REQUIRED" } : {}),
    },
  });

  await logActivity({
    actor: "AGENT",
    module: "OPERATOR",
    action: "operator.decide",
    entityType: "Reply",
    entityId: replyId,
    summary:
      `Décision ${decision.action} pour ${prospectName ?? "un expéditeur inconnu"} — ` +
      `${decision.autoAllowed ? "exécutable seule" : "attend votre validation"}. ${decision.reason}`,
    details: { action: decision.action, autoAllowed: decision.autoAllowed, gates: decision.gates },
    level: decision.action === "HUMAN_REVIEW" ? "WARN" : "INFO",
  });

  return decision;
}
