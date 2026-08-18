// ---------------------------------------------------------------------------
// SYNCHRONISATION DE LA BOITE — lecture seule
//
// Lit les nouveaux messages depuis le dernier UID traite, les ingere, et
// memorise l'avancement pour ne jamais relire deux fois la meme chose.
//
// CE MODULE N'ENVOIE JAMAIS D'EMAIL et ne modifie jamais la boite.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { config } from "@/lib/config";
import type { InboundMailSource } from "@/lib/imap/types";
import { ingestReply, type IngestOutcome } from "./ingest";

export type SyncReport = {
  folder: string;
  fetched: number;
  stored: number;
  duplicates: number;
  skipped: Array<{ from: string; reason: string }>;
  optOuts: number;
  interested: number;
  needsHuman: number;
  unmatched: number;
  outcomes: IngestOutcome[];
  error?: string;
};

/** Adresses a ignorer : nos propres envois revenus dans la boite. */
function isOwnAddress(email: string): boolean {
  const own = [config.from.email, config.from.replyTo]
    .filter(Boolean)
    .map((a) => a.toLowerCase());
  return own.includes(email.trim().toLowerCase());
}

export async function syncReplies(
  source: InboundMailSource,
  options: { max?: number; sinceDays?: number; folder?: string } = {},
): Promise<SyncReport> {
  const info = await source.verify();
  const folder = options.folder ?? info.folder;

  const state = await prisma.imapSyncState.upsert({
    where: { folder },
    update: {},
    create: { folder },
  });

  // UIDVALIDITY a change : les UID memorises ne designent plus les memes
  // messages. On repart de zero — la deduplication par Message-ID evite
  // malgre tout tout doublon.
  const validityChanged =
    state.uidValidity !== null && state.uidValidity !== info.uidValidity;
  const sinceUid = validityChanged ? 0 : state.lastSeenUid;

  const sinceDays = options.sinceDays ?? 90;
  const since =
    sinceDays > 0 ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) : undefined;

  const report: SyncReport = {
    folder,
    fetched: 0,
    stored: 0,
    duplicates: 0,
    skipped: [],
    optOuts: 0,
    interested: 0,
    needsHuman: 0,
    unmatched: 0,
    outcomes: [],
  };

  let emails;
  try {
    emails = await source.fetch({ sinceUid, since, max: options.max ?? 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.imapSyncState.update({
      where: { folder },
      data: { lastRunAt: new Date(), lastError: message },
    });
    await logActivity({
      actor: "SYSTEM",
      module: "REPLIES",
      action: "replies.sync_failed",
      summary: `Lecture de la boîte impossible (${folder}) : ${message}`,
      level: "ERROR",
    });
    return { ...report, error: message };
  }

  report.fetched = emails.length;
  let highestUid = sinceUid;

  for (const email of emails) {
    highestUid = Math.max(highestUid, email.uid);

    if (isOwnAddress(email.fromEmail)) {
      report.skipped.push({ from: email.fromEmail, reason: "Notre propre adresse d'expédition." });
      continue;
    }

    const outcome = await ingestReply({
      fromEmail: email.fromEmail,
      fromName: email.fromName,
      toEmail: email.toEmail,
      subject: email.subject,
      body: email.text,
      receivedAt: email.receivedAt,
      messageId: email.messageId,
      imapFolder: email.folder,
      imapUid: email.uid,
      source: "IMAP",
      isAutoReply: email.isAutoReply,
    });

    report.outcomes.push(outcome);
    if (outcome.duplicate) report.duplicates += 1;
    else report.stored += 1;
    if (outcome.optedOut) report.optOuts += 1;
    if (["INTERESTED", "PRICE_REQUEST", "MEETING_REQUEST"].includes(outcome.classification)) {
      report.interested += 1;
    }
    if (outcome.classification === "NEEDS_HUMAN") report.needsHuman += 1;
    if (!outcome.prospectId) report.unmatched += 1;
  }

  await prisma.imapSyncState.update({
    where: { folder },
    data: {
      lastSeenUid: highestUid,
      uidValidity: info.uidValidity,
      lastRunAt: new Date(),
      lastError: null,
      messagesSeen: { increment: report.fetched },
      messagesStored: { increment: report.stored },
    },
  });

  await logActivity({
    actor: "SYSTEM",
    module: "REPLIES",
    action: "replies.sync",
    summary:
      `Boîte ${folder} lue : ${report.fetched} message(s) examiné(s), ${report.stored} enregistré(s), ` +
      `${report.duplicates} doublon(s) ignoré(s), ${report.optOuts} opposition(s), ` +
      `${report.needsHuman} nécessitant une intervention. Aucun email envoyé, aucun message modifié.`,
    details: {
      fetched: report.fetched,
      stored: report.stored,
      duplicates: report.duplicates,
      optOuts: report.optOuts,
      unmatched: report.unmatched,
    },
  });

  return report;
}

/** Chiffres du centre de tri, pour l'agent et le tableau de bord. */
export async function replyInbox() {
  const [byStatus, byClass, recent, lastSync] = await Promise.all([
    prisma.reply.groupBy({ by: ["reviewStatus"], _count: { _all: true } }),
    prisma.reply.groupBy({ by: ["classification"], _count: { _all: true } }),
    prisma.reply.count({ where: { receivedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.imapSyncState.findFirst({ orderBy: { lastRunAt: "desc" } }),
  ]);

  const count = (rows: Array<{ _count: { _all: number } }>, key: string, field: "reviewStatus" | "classification") =>
    (rows as Array<Record<string, unknown> & { _count: { _all: number } }>)
      .filter((r) => r[field] === key)
      .reduce((s, r) => s + r._count._all, 0);

  return {
    total: byStatus.reduce((s, r) => s + r._count._all, 0),
    new: count(byStatus, "NEW", "reviewStatus"),
    actionRequired: count(byStatus, "ACTION_REQUIRED", "reviewStatus"),
    reviewed: count(byStatus, "REVIEWED", "reviewStatus"),
    resolved: count(byStatus, "RESOLVED", "reviewStatus"),
    interested:
      count(byClass, "INTERESTED", "classification") +
      count(byClass, "PRICE_REQUEST", "classification") +
      count(byClass, "MEETING_REQUEST", "classification"),
    optOuts: count(byClass, "OPT_OUT", "classification"),
    needsHuman: count(byClass, "NEEDS_HUMAN", "classification"),
    unknown: count(byClass, "UNKNOWN", "classification"),
    last7Days: recent,
    lastSyncAt: lastSync?.lastRunAt ?? null,
    lastSyncError: lastSync?.lastError ?? null,
  };
}
