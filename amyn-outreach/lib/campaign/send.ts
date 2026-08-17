// ---------------------------------------------------------------------------
// PIPELINE D'ENVOI
//
// Un envoi = conformite -> transport -> journalisation -> mise a jour statut.
// Aucune etape ne peut etre sautee. Tout est journalise, y compris les refus.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { getMailer } from "@/lib/mailer";
import { logActivity } from "@/lib/activity";
import { runComplianceChecks, type ComplianceReport, type SendCandidate } from "./compliance";

export type SendOutcome = {
  sent: boolean;
  simulated: boolean;
  blocked: boolean;
  reason?: string;
  compliance: ComplianceReport;
  sendLogId?: string;
};

export async function sendOne(candidate: SendCandidate): Promise<SendOutcome> {
  const compliance = await runComplianceChecks(candidate);

  const prospect = await prisma.prospect.findUnique({
    where: { id: candidate.prospectId },
    include: { primaryContact: true },
  });
  const draft = await prisma.emailDraft.findUnique({ where: { id: candidate.draftId } });
  const toEmail = prospect?.primaryContact?.email ?? "(inconnu)";

  // --- Refus : on trace, on n'envoie pas -----------------------------------
  if (!compliance.allowed) {
    const reason = compliance.checks
      .filter((c) => !c.passed)
      .map((c) => `${c.name} : ${c.detail}`)
      .join(" | ");

    const log = await prisma.sendLog.create({
      data: {
        prospectId: candidate.prospectId,
        emailDraftId: candidate.draftId,
        campaignId: candidate.campaignId ?? null,
        transport: config.dryRun ? "dry-run" : config.mailTransport,
        status: "BLOCKED",
        dryRun: config.dryRun,
        toEmail,
        subject: draft?.subject ?? "",
        error: reason,
        complianceReport: JSON.stringify(compliance),
        sequenceStep: candidate.step,
      },
    });

    await logActivity({
      actor: "SYSTEM",
      module: "SEND",
      action: "send.blocked",
      entityType: "Prospect",
      entityId: candidate.prospectId,
      summary: `Envoi refusé pour ${prospect?.name ?? candidate.prospectId} — bloqué par : ${compliance.blockedBy.join(", ")}`,
      details: compliance,
      level: "WARN",
    });

    return { sent: false, simulated: false, blocked: true, reason, compliance, sendLogId: log.id };
  }

  // --- Envoi (ou simulation) ----------------------------------------------
  const mailer = getMailer();
  const result = await mailer.send({
    to: toEmail,
    subject: draft!.subject,
    text: draft!.body,
    replyTo: config.from.replyTo,
  });

  const log = await prisma.sendLog.create({
    data: {
      prospectId: candidate.prospectId,
      emailDraftId: candidate.draftId,
      campaignId: candidate.campaignId ?? null,
      transport: result.transport,
      status: result.status,
      dryRun: result.dryRun,
      toEmail,
      subject: draft!.subject,
      providerMessageId: result.providerMessageId,
      error: result.error,
      complianceReport: JSON.stringify(compliance),
      sequenceStep: candidate.step,
    },
  });

  // Le statut n'avance QUE sur un envoi reellement transmis.
  if (result.status === "SENT") {
    await prisma.prospect.update({
      where: { id: candidate.prospectId },
      data: { status: "CONTACTED", lastInteractionAt: new Date() },
    });
    await prisma.statusEvent.create({
      data: {
        prospectId: candidate.prospectId,
        fromStatus: prospect!.status,
        toStatus: "CONTACTED",
        reason: `Email envoyé à ${toEmail} (étape ${candidate.step}).`,
        actor: "SYSTEM",
      },
    });
  }

  if (candidate.campaignId) {
    await prisma.campaignMember.updateMany({
      where: { campaignId: candidate.campaignId, prospectId: candidate.prospectId },
      data: {
        status: result.status === "SENT" ? "SENT" : "PENDING",
        lastSentAt: result.status === "SENT" ? new Date() : undefined,
        sequenceStep: candidate.step,
      },
    });
  }

  await logActivity({
    actor: "SYSTEM",
    module: "SEND",
    action: result.dryRun ? "send.simulated" : "send.real",
    entityType: "Prospect",
    entityId: candidate.prospectId,
    summary: `${result.dryRun ? "Envoi SIMULÉ" : "Email envoyé"} à ${toEmail} — « ${draft!.subject} »`,
    details: { transport: result.transport, status: result.status, messageId: result.providerMessageId },
  });

  return {
    sent: result.status === "SENT",
    simulated: result.status === "SIMULATED",
    blocked: false,
    compliance,
    sendLogId: log.id,
  };
}

/** Envoi test vers sa propre adresse. Obligatoire avant tout envoi reel. */
export async function sendTestEmail(to: string): Promise<{
  ok: boolean;
  transport: string;
  dryRun: boolean;
  messageId?: string;
  error?: string;
}> {
  const mailer = getMailer();
  const now = new Date().toISOString();

  const result = await mailer.send({
    to,
    subject: "AMYN Outreach — test de configuration",
    text: [
      "Ceci est un test de configuration d'AMYN Outreach.",
      "",
      `Envoyé le : ${now}`,
      `Transport : ${mailer.name}`,
      `Expéditeur configuré : ${config.from.name} <${config.from.email}>`,
      `Mode simulation (DRY_RUN) : ${config.dryRun ? "oui" : "non"}`,
      "",
      "Si vous recevez ce message, la chaîne d'envoi fonctionne :",
      "  • la configuration SMTP est correcte",
      "  • l'expéditeur est accepté par le serveur",
      "  • le message n'a pas été rejeté",
      "",
      "Vérifiez également que ce message n'est pas arrivé en spam.",
      "",
      "AMYN — Web & Growth",
    ].join("\n"),
  });

  await logActivity({
    actor: "HUMAN",
    module: "SEND",
    action: "send.test",
    summary: `Test d'envoi vers ${to} — ${result.status} via ${result.transport}.`,
    details: { status: result.status, error: result.error },
    level: result.status === "FAILED" ? "ERROR" : "INFO",
  });

  return {
    ok: result.status === "SENT" || result.status === "SIMULATED",
    transport: result.transport,
    dryRun: result.dryRun,
    messageId: result.providerMessageId,
    error: result.error,
  };
}
