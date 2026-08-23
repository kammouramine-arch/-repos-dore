"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { composeReply } from "@/lib/email/replies";
import { addToSuppressionList } from "@/lib/campaign/compliance";

/**
 * Rédige la réponse proposée pour une conversation.
 *
 * RÉDIGE SEULEMENT. Le brouillon est stocké en DRAFT : rien ne part.
 */
export async function draftReply(replyId: string) {
  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: { prospect: { select: { name: true } } },
  });
  if (!reply) throw new Error("Réponse introuvable.");

  if (reply.decisionAction === "BLACKLIST") {
    throw new Error(
      "Ce prospect a demandé à ne plus être contacté : aucune réponse commerciale ne peut être rédigée.",
    );
  }

  const composed = await composeReply(replyId);

  await prisma.reply.update({
    where: { id: replyId },
    data: {
      proposedSubject: composed.subject,
      proposedBody: composed.body,
      proposedStatus: composed.verification.passed ? "DRAFT" : "REJECTED",
      proposedAt: new Date(),
    },
  });

  await logActivity({
    actor: "AGENT",
    module: "OPERATOR",
    action: "operator.draft_reply",
    entityType: "Reply",
    entityId: replyId,
    summary:
      `Réponse rédigée pour ${reply.prospect?.name ?? reply.fromEmail} (${composed.kind}) — ` +
      `${composed.verification.passed ? "vérification passée" : "REFUSÉE : " + composed.verification.problems.join(" | ")}. Rien n'a été envoyé.`,
    details: { kind: composed.kind, avoided: composed.avoided },
    level: composed.verification.passed ? "INFO" : "WARN",
  });

  revalidatePath("/operator");
  revalidatePath(`/replies/${replyId}`);
  return { ok: composed.verification.passed, problems: composed.verification.problems };
}

/** Approuve la réponse rédigée. Elle reste en attente d'envoi. */
export async function approveProposedReply(replyId: string) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId } });
  if (!reply) throw new Error("Réponse introuvable.");
  if (reply.proposedStatus !== "DRAFT") {
    throw new Error("Aucun brouillon en attente d'approbation pour cette conversation.");
  }
  if (reply.decisionAction === "BLACKLIST") {
    throw new Error("Prospect en opposition : approbation refusée.");
  }

  await prisma.reply.update({
    where: { id: replyId },
    data: { proposedStatus: "APPROVED", approvedBy: "HUMAN", reviewStatus: "REVIEWED" },
  });

  await logActivity({
    actor: "HUMAN",
    module: "OPERATOR",
    action: "operator.approve_reply",
    entityType: "Reply",
    entityId: replyId,
    summary: `Réponse approuvée pour ${reply.fromEmail}. Elle partira au prochain envoi autorisé.`,
  });

  revalidatePath("/operator");
}

/** Écarte la réponse rédigée. */
export async function rejectProposedReply(replyId: string, note?: string) {
  await prisma.reply.update({
    where: { id: replyId },
    data: { proposedStatus: "REJECTED", handledNote: note ?? null, reviewStatus: "REVIEWED" },
  });
  await logActivity({
    actor: "HUMAN",
    module: "OPERATOR",
    action: "operator.reject_reply",
    entityType: "Reply",
    entityId: replyId,
    summary: `Réponse rédigée écartée${note ? ` — ${note}` : ""}.`,
  });
  revalidatePath("/operator");
}

/** Arrête définitivement tout contact avec cette adresse. */
export async function stopContacting(replyId: string) {
  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: { prospect: { select: { name: true } } },
  });
  if (!reply) throw new Error("Réponse introuvable.");

  await addToSuppressionList({
    email: reply.fromEmail,
    reason: "MANUAL",
    source: "Décision prise depuis le centre de contrôle",
  });

  await prisma.reply.update({
    where: { id: replyId },
    data: {
      decisionAction: "BLACKLIST",
      decisionAuto: true,
      decisionReason: "Arrêt demandé manuellement depuis le centre de contrôle.",
      proposedStatus: "REJECTED",
      reviewStatus: "RESOLVED",
      handled: true,
      handledAt: new Date(),
    },
  });

  await logActivity({
    actor: "HUMAN",
    module: "OPERATOR",
    action: "operator.stop_contacting",
    entityType: "Reply",
    entityId: replyId,
    summary: `${reply.prospect?.name ?? reply.fromEmail} ne sera plus jamais contacté (décision manuelle).`,
    level: "WARN",
  });

  revalidatePath("/operator");
  revalidatePath("/replies");
}
