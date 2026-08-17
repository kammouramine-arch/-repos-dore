// ---------------------------------------------------------------------------
// CAMPAGNES — creation, alimentation, execution progressive.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { logActivity } from "@/lib/activity";
import { generateEmail } from "@/lib/email/generate";
import { sendOne } from "./send";

export * from "./compliance";
export * from "./send";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function createCampaign(input: {
  name: string;
  targetCriteria?: unknown;
  targetOffer?: string;
  dailyLimit?: number;
  isDemo?: boolean;
}) {
  const base = slugify(input.name) || "campagne";
  let slug = base;
  let n = 1;
  while (await prisma.campaign.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      slug,
      targetCriteria: input.targetCriteria ? JSON.stringify(input.targetCriteria) : null,
      targetOffer: input.targetOffer,
      fromEmail: config.from.email,
      fromName: config.from.name,
      dailyLimit: input.dailyLimit ?? config.limits.dailySend,
      minDelaySeconds: config.limits.minDelaySeconds,
      isDemo: input.isDemo ?? false,
      status: "DRAFT",
    },
  });

  await logActivity({
    actor: "SYSTEM",
    module: "CAMPAIGN",
    action: "campaign.create",
    entityType: "Campaign",
    entityId: campaign.id,
    summary: `Campagne « ${campaign.name} » créée.`,
    details: { criteria: input.targetCriteria },
  });

  return campaign;
}

export async function addProspectsToCampaign(campaignId: string, prospectIds: string[]) {
  let added = 0;
  for (const prospectId of prospectIds) {
    const existing = await prisma.campaignMember.findUnique({
      where: { campaignId_prospectId: { campaignId, prospectId } },
    });
    if (existing) continue;
    await prisma.campaignMember.create({ data: { campaignId, prospectId, status: "PENDING" } });
    added += 1;
  }
  return added;
}

/**
 * Prepare une campagne : genere les emails manquants pour les membres
 * disposant d'un contact et de problemes prouves. Marque les autres BLOCKED.
 */
export async function prepareCampaign(campaignId: string) {
  const members = await prisma.campaignMember.findMany({
    where: { campaignId, status: { in: ["PENDING", "BLOCKED"] } },
    include: {
      prospect: {
        include: { issues: { select: { id: true } }, primaryContact: true },
      },
    },
  });

  let prepared = 0;
  let blocked = 0;
  const blockedReasons: Record<string, number> = {};

  for (const member of members) {
    const p = member.prospect;
    let reason: string | null = null;

    if (!p.primaryContactId) reason = "Aucun email professionnel public trouvé.";
    else if (p.issues.length === 0) reason = "Aucun problème prouvé : rien de factuel à écrire.";
    else if (["OPTOUT", "LOST", "WON"].includes(p.status)) reason = `Statut ${p.status}.`;

    if (reason) {
      await prisma.campaignMember.update({
        where: { id: member.id },
        data: { status: "BLOCKED", blockedReason: reason },
      });
      blockedReasons[reason] = (blockedReasons[reason] ?? 0) + 1;
      blocked += 1;
      continue;
    }

    try {
      const email = await generateEmail(p.id, { campaignId, step: 0 });
      await prisma.campaignMember.update({
        where: { id: member.id },
        data: {
          status: email.verification.passed ? "READY" : "BLOCKED",
          blockedReason: email.verification.passed
            ? null
            : `Vérification anti-invention échouée : ${email.verification.problems.join(" ; ")}`,
        },
      });
      if (email.verification.passed) prepared += 1;
      else blocked += 1;
    } catch (err) {
      await prisma.campaignMember.update({
        where: { id: member.id },
        data: { status: "BLOCKED", blockedReason: (err as Error).message },
      });
      blocked += 1;
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: prepared > 0 ? "READY" : "DRAFT" },
  });

  await logActivity({
    actor: "SYSTEM",
    module: "CAMPAIGN",
    action: "campaign.prepare",
    entityType: "Campaign",
    entityId: campaignId,
    summary: `Campagne préparée : ${prepared} email(s) prêt(s), ${blocked} bloqué(s).`,
    details: { prepared, blocked, blockedReasons },
  });

  return { prepared, blocked, blockedReasons };
}

/** Approbation humaine explicite. Sans elle, rien ne part. */
export async function approveCampaignMembers(campaignId: string, approvedBy = "HUMAN") {
  const members = await prisma.campaignMember.findMany({
    where: { campaignId, status: "READY" },
    include: { prospect: { include: { emailDrafts: { where: { isActive: true } } } } },
  });

  let approved = 0;
  for (const member of members) {
    const draft = member.prospect.emailDrafts.find((d) => d.sequenceStep === member.sequenceStep);
    if (!draft || !draft.verificationPassed) continue;
    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: { approvedAt: new Date(), approvedBy },
    });
    await prisma.campaignMember.update({ where: { id: member.id }, data: { status: "APPROVED" } });
    approved += 1;
  }

  await logActivity({
    actor: "HUMAN",
    module: "CAMPAIGN",
    action: "campaign.approve",
    entityType: "Campaign",
    entityId: campaignId,
    summary: `${approved} email(s) approuvé(s) manuellement pour envoi.`,
  });

  return { approved };
}

/**
 * Execute une campagne, dans la limite du plafond quotidien.
 * En DRY_RUN, les envois sont simules mais TOUT le reste est identique.
 */
export async function runCampaign(campaignId: string, options: { max?: number } = {}) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campagne introuvable.");

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "RUNNING", startedAt: campaign.startedAt ?? new Date() },
  });

  const members = await prisma.campaignMember.findMany({
    where: { campaignId, status: "APPROVED" },
    include: { prospect: { include: { emailDrafts: { where: { isActive: true } } } } },
    take: options.max ?? campaign.dailyLimit,
  });

  const results = { sent: 0, simulated: 0, blocked: 0, details: [] as string[] };

  // Aucune action silencieuse : les membres non approuves sont comptes et
  // expliques, pas ignores sans un mot.
  const notApproved = await prisma.campaignMember.findMany({
    where: { campaignId, status: { in: ["PENDING", "READY"] } },
    include: { prospect: { select: { name: true } } },
  });
  for (const member of notApproved) {
    results.blocked += 1;
    results.details.push(
      `${member.prospect.name} : non envoyé — en attente d'approbation (statut ${member.status}).`,
    );
  }

  for (const member of members) {
    const draft = member.prospect.emailDrafts.find((d) => d.sequenceStep === member.sequenceStep);
    if (!draft) {
      results.blocked += 1;
      results.details.push(`${member.prospect.name} : aucun brouillon actif.`);
      continue;
    }

    const outcome = await sendOne({
      prospectId: member.prospectId,
      campaignId,
      draftId: draft.id,
      step: member.sequenceStep,
    });

    if (outcome.sent) {
      results.sent += 1;
      results.details.push(`${member.prospect.name} : envoyé.`);
    } else if (outcome.simulated) {
      results.simulated += 1;
      results.details.push(`${member.prospect.name} : simulé (DRY_RUN).`);
    } else {
      results.blocked += 1;
      results.details.push(`${member.prospect.name} : bloqué — ${outcome.compliance.blockedBy.join(", ")}`);
    }
  }

  const remaining = await prisma.campaignMember.count({
    where: { campaignId, status: "APPROVED" },
  });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: remaining === 0 ? "DONE" : "RUNNING", endedAt: remaining === 0 ? new Date() : null },
  });

  return results;
}
