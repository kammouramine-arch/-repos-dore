// ---------------------------------------------------------------------------
// MODULE REPONSES — enregistrement, classement, consequences.
//
// Une reponse ne se contente pas d'etre classee : elle FAIT AVANCER le
// prospect, et declenche automatiquement l'opposition si necessaire.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { ingestReply } from "./ingest";

export * from "./classify";
export * from "./match";
export * from "./ingest";
export * from "./sync";

/**
 * Saisie manuelle d'une reponse (CLI, agent).
 *
 * Adaptateur sur ingestReply : une seule chaine de traitement, donc les memes
 * garanties — deduplication, opposition prioritaire, mise a jour CRM, trace.
 */
export async function recordReply(input: {
  prospectId: string;
  fromEmail: string;
  subject: string;
  body: string;
  campaignId?: string;
  receivedAt?: Date;
  externalId?: string;
}) {
  const prospect = await prisma.prospect.findUnique({ where: { id: input.prospectId } });
  if (!prospect) throw new Error(`Prospect introuvable : ${input.prospectId}`);

  const outcome = await ingestReply({
    fromEmail: input.fromEmail,
    subject: input.subject,
    body: input.body,
    receivedAt: input.receivedAt,
    messageId: input.externalId ?? null,
    source: "MANUAL",
    forceProspectId: input.prospectId,
  });

  const reply = outcome.replyId
    ? await prisma.reply.findUniqueOrThrow({ where: { id: outcome.replyId } })
    : null;

  return {
    reply,
    classification: outcome.classification,
    confidence: outcome.confidence,
    matchedSignals: reply?.matchedSignals ? (JSON.parse(reply.matchedSignals) as string[]) : [],
    reason: outcome.reason,
    recommendedAction: outcome.recommendedAction,
  };
}

export async function pendingReplies() {
  return prisma.reply.findMany({
    where: { handled: false },
    orderBy: { receivedAt: "desc" },
    include: { prospect: { select: { id: true, name: true, city: true, status: true } } },
  });
}
