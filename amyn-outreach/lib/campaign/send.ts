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
import {
  copierDansEnvoyes, BoiteImap,
  type BoiteEnvoi, type SentCopyResult,
} from "@/lib/mailer/sent-copy";

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
      providerResponse: result.providerResponse,
      messageId: result.messageId,
      // Les octets exacts transmis, conserves pour pouvoir reprendre la copie
      // dans « Envoyes » a l'identique si elle echoue maintenant.
      rawMessage: result.raw ? result.raw.toString("utf-8") : null,
      error: result.error,
      complianceReport: JSON.stringify(compliance),
      sequenceStep: candidate.step,
    },
  });

  // --- Copie dans « Envoyes » ---------------------------------------------
  //
  // SMTP transmet, il ne range rien. Sans ce depot, un email reellement parti
  // reste invisible depuis la boite — c'est exactement ce qui s'est produit.
  //
  // ATTENTION A L'ORDRE ET AUX CONSEQUENCES : l'envoi est deja journalise
  // SENT ci-dessus. Ce qui suit ne peut plus l'annuler. Un echec de copie est
  // consigne comme tel, et n'a AUCUN effet sur le statut d'envoi : traiter une
  // copie ratee comme un envoi rate conduirait a renvoyer le message.
  if (result.status === "SENT" && result.raw && result.messageId) {
    const copie = await copierEnvoiDansDossier({
      sendLogId: log.id,
      raw: result.raw,
      messageId: result.messageId,
    });

    if (copie.status === "FAILED") {
      await logActivity({
        actor: "SYSTEM",
        module: "SEND",
        action: "send.sent_copy_failed",
        entityType: "Prospect",
        entityId: candidate.prospectId,
        summary:
          `Email BIEN ENVOYÉ à ${toEmail}, mais absent du dossier Envoyés : ${copie.detail} ` +
          `Reprise possible sans réexpédier : npm run amyn -- sent-copy retry`,
        level: "WARN",
      });
    }
  }

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
    details: {
      transport: result.transport,
      status: result.status,
      messageId: result.messageId ?? result.providerMessageId,
    },
  });

  return {
    sent: result.status === "SENT",
    simulated: result.status === "SIMULATED",
    blocked: false,
    compliance,
    sendLogId: log.id,
  };
}

/**
 * Depose une copie dans « Envoyes » et consigne le resultat sur le SendLog.
 *
 * IDEMPOTENCE A DEUX NIVEAUX. La base evite un travail inutile — un envoi
 * deja copie n'est pas retente. Le serveur IMAP tranche vraiment : il est
 * interroge sur le Message-ID avant tout depot, si bien qu'une base restaurée
 * ou un double appel ne peuvent pas produire deux copies.
 */
export async function copierEnvoiDansDossier(input: {
  sendLogId: string;
  raw: Buffer;
  messageId: string;
  /** Injectable : les tests ne se connectent a aucune boite. */
  boite?: BoiteEnvoi;
}): Promise<SentCopyResult> {
  const log = await prisma.sendLog.findUnique({
    where: { id: input.sendLogId },
    select: { sentCopyStatus: true, sentCopyFolder: true, sentCopyUid: true },
  });

  if (log && (log.sentCopyStatus === "COPIED" || log.sentCopyStatus === "ALREADY_PRESENT")) {
    return {
      status: log.sentCopyStatus as SentCopyResult["status"],
      folder: log.sentCopyFolder ?? undefined,
      uid: log.sentCopyUid ?? undefined,
      detail: "Copie déjà effectuée : rien à refaire.",
    };
  }

  const propre = !input.boite;
  const boite = input.boite ?? new BoiteImap();

  const resultat = await copierDansEnvoyes(
    {
      raw: input.raw,
      messageId: input.messageId,
      folder: process.env.IMAP_SENT_FOLDER?.trim() || undefined,
    },
    boite,
  );

  if (propre && boite instanceof BoiteImap) await boite.fermer().catch(() => {});

  await prisma.sendLog.update({
    where: { id: input.sendLogId },
    data: {
      sentCopyStatus: resultat.status,
      sentCopyFolder: resultat.folder ?? null,
      sentCopyUid: resultat.uid ?? null,
      sentCopyError: resultat.status === "FAILED" ? resultat.detail : null,
      sentCopyAt: new Date(),
    },
  });

  return resultat;
}

/**
 * Reprend les copies manquantes, a partir des octets conserves.
 *
 * Ne reexpedie RIEN : le message n'est pas renvoye au serveur SMTP, il est
 * seulement depose dans le dossier. C'est la difference entre ranger une
 * lettre deja postee et la poster une seconde fois.
 */
export async function reprendreCopiesManquantes(
  options: { max?: number; boite?: BoiteEnvoi } = {},
): Promise<{ traites: number; copies: number; dejaPresents: number; echecs: number; details: string[] }> {
  const enAttente = await prisma.sendLog.findMany({
    where: {
      status: "SENT",
      dryRun: false,
      rawMessage: { not: null },
      messageId: { not: null },
      sentCopyStatus: { in: ["NOT_ATTEMPTED", "FAILED"] },
    },
    select: { id: true, messageId: true, rawMessage: true, toEmail: true, subject: true },
    orderBy: { createdAt: "asc" },
    take: options.max ?? 50,
  });

  const bilan = { traites: 0, copies: 0, dejaPresents: 0, echecs: 0, details: [] as string[] };
  if (enAttente.length === 0) return bilan;

  const propre = !options.boite;
  const boite = options.boite ?? new BoiteImap();

  for (const log of enAttente) {
    const r = await copierEnvoiDansDossier({
      sendLogId: log.id,
      raw: Buffer.from(log.rawMessage!, "utf-8"),
      messageId: log.messageId!,
      boite,
    });
    bilan.traites += 1;
    if (r.status === "COPIED") bilan.copies += 1;
    else if (r.status === "ALREADY_PRESENT") bilan.dejaPresents += 1;
    else bilan.echecs += 1;
    bilan.details.push(`${log.toEmail} — « ${log.subject} » : ${r.detail}`);
  }

  if (propre && boite instanceof BoiteImap) await boite.fermer().catch(() => {});
  return bilan;
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
