// ---------------------------------------------------------------------------
// MODULE REPONSES — enregistrement, classement, consequences.
//
// Une reponse ne se contente pas d'etre classee : elle FAIT AVANCER le
// prospect, et declenche automatiquement l'opposition si necessaire.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { addToSuppressionList } from "@/lib/campaign/compliance";
import { classifyReply } from "./classify";

export * from "./classify";

const STATUS_BY_CLASS: Record<string, string> = {
  INTERESTED: "INTERESTED",
  PRICE_REQUEST: "INTERESTED",
  MEETING_REQUEST: "MEETING",
  QUESTION: "REPLIED",
  LATER: "REPLIED",
  NOT_INTERESTED: "LOST",
  OPT_OUT: "OPTOUT",
  BOUNCE: "BLOCKED",
  OTHER: "REPLIED",
};

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

  const result = classifyReply({ subject: input.subject, body: input.body });

  const reply = await prisma.reply.create({
    data: {
      prospectId: input.prospectId,
      campaignId: input.campaignId,
      fromEmail: input.fromEmail.toLowerCase(),
      subject: input.subject,
      body: input.body,
      receivedAt: input.receivedAt ?? new Date(),
      classification: result.classification,
      confidence: result.confidence,
      matchedSignals: JSON.stringify(result.matchedSignals),
      externalId: input.externalId,
    },
  });

  // --- Consequences automatiques -------------------------------------------
  if (result.classification === "OPT_OUT") {
    await addToSuppressionList({
      email: input.fromEmail,
      reason: "UNSUBSCRIBED",
      source: "Réponse à un email de prospection",
      campaignId: input.campaignId,
      notes: result.reason,
    });
  }

  if (result.classification === "BOUNCE") {
    await addToSuppressionList({
      email: input.fromEmail,
      reason: "BOUNCED",
      source: "Rebond détecté",
      campaignId: input.campaignId,
      notes: result.reason,
    });
    await prisma.sendLog.updateMany({
      where: { prospectId: input.prospectId, toEmail: input.fromEmail.toLowerCase() },
      data: { bounceType: "HARD", bounceDetail: input.subject },
    });
  }

  const newStatus = STATUS_BY_CLASS[result.classification];
  if (newStatus && newStatus !== prospect.status && prospect.status !== "WON") {
    await prisma.prospect.update({
      where: { id: input.prospectId },
      data: {
        status: newStatus,
        lastInteractionAt: reply.receivedAt,
        ...(result.classification === "INTERESTED" || result.classification === "PRICE_REQUEST"
          ? { nextAction: "Répondre au prospect intéressé" }
          : {}),
        ...(result.classification === "MEETING_REQUEST"
          ? { nextAction: "Proposer un créneau" }
          : {}),
      },
    });
    await prisma.statusEvent.create({
      data: {
        prospectId: input.prospectId,
        fromStatus: prospect.status,
        toStatus: newStatus,
        reason: result.reason,
        actor: "SYSTEM",
      },
    });
  }

  // Une reponse arrete toute relance en cours.
  if (input.campaignId) {
    await prisma.campaignMember.updateMany({
      where: { campaignId: input.campaignId, prospectId: input.prospectId },
      data: { status: "REPLIED", nextSendAt: null },
    });
  } else {
    await prisma.campaignMember.updateMany({
      where: { prospectId: input.prospectId, status: { in: ["APPROVED", "SENT", "READY"] } },
      data: { status: "REPLIED", nextSendAt: null },
    });
  }

  await logActivity({
    actor: "SYSTEM",
    module: "REPLIES",
    action: "replies.classify",
    entityType: "Prospect",
    entityId: input.prospectId,
    summary: `Réponse de ${input.fromEmail} classée ${result.classification} (confiance ${result.confidence}) — ${prospect.name}.`,
    details: { reason: result.reason, signals: result.matchedSignals },
  });

  return { reply, ...result };
}

export async function pendingReplies() {
  return prisma.reply.findMany({
    where: { handled: false },
    orderBy: { receivedAt: "desc" },
    include: { prospect: { select: { id: true, name: true, city: true, status: true } } },
  });
}
