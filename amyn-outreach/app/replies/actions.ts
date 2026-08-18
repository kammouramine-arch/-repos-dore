"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/constants";

/**
 * Change l'etat de traitement d'une reponse.
 *
 * Ecriture locale uniquement : aucun email n'est envoye, la boite n'est pas
 * touchee. C'est votre suivi de lecture, rien d'autre.
 */
export async function setReviewStatus(replyId: string, status: string) {
  if (!(REVIEW_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`État de traitement inconnu : ${status}`);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: { prospect: { select: { name: true } } },
  });
  if (!reply) throw new Error("Réponse introuvable.");

  const resolved = status === "RESOLVED";
  await prisma.reply.update({
    where: { id: replyId },
    data: {
      reviewStatus: status as ReviewStatus,
      handled: resolved,
      handledAt: resolved ? new Date() : null,
    },
  });

  await logActivity({
    actor: "HUMAN",
    module: "REPLIES",
    action: "replies.review",
    entityType: "Reply",
    entityId: replyId,
    summary: `Réponse de ${reply.fromEmail}${reply.prospect ? ` (${reply.prospect.name})` : ""} marquée « ${status} ».`,
  });

  revalidatePath("/replies");
  revalidatePath(`/replies/${replyId}`);
  revalidatePath("/");
}
