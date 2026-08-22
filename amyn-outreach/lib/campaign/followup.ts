// ---------------------------------------------------------------------------
// RELANCES
//
// Sequence : email initial -> relance 1 -> relance 2 -> stop.
// Une relance ne part JAMAIS si :
//   • le prospect a repondu
//   • il est en liste d'opposition
//   • le delai configure n'est pas ecoule
//   • le nombre maximum de relances est atteint
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { generateEmail } from "@/lib/email/generate";

export type FollowUpCandidate = {
  prospectId: string;
  prospectName: string;
  campaignId: string;
  nextStep: number;
  lastSentAt: Date;
  daysSince: number;
};

/** Qui est eligible a une relance, et pourquoi. */
export async function findFollowUpCandidates(campaignId?: string): Promise<{
  candidates: FollowUpCandidate[];
  skipped: Array<{ name: string; reason: string }>;
}> {
  // On inclut volontairement les membres deja passes en REPLIED : ils seront
  // ecartes plus bas AVEC une raison lisible. Les filtrer ici les ferait
  // disparaitre sans un mot, contrairement au principe « aucune action
  // silencieuse ».
  const members = await prisma.campaignMember.findMany({
    where: {
      status: { in: ["SENT", "REPLIED"] },
      ...(campaignId ? { campaignId } : {}),
    },
    include: { campaign: true, prospect: { include: { primaryContact: true } } },
  });

  const candidates: FollowUpCandidate[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  for (const member of members) {
    const p = member.prospect;

    if (["OPTOUT", "LOST", "WON", "BLOCKED"].includes(p.status)) {
      skipped.push({ name: p.name, reason: `Statut ${p.status} : aucune relance.` });
      continue;
    }

    const replied = await prisma.reply.count({ where: { prospectId: p.id } });
    if (replied > 0 || member.status === "REPLIED") {
      skipped.push({ name: p.name, reason: "A déjà répondu : la séquence s'arrête." });
      continue;
    }

    if (member.sequenceStep >= member.campaign.maxFollowUps) {
      skipped.push({
        name: p.name,
        reason: `Nombre maximum de relances atteint (${member.campaign.maxFollowUps}).`,
      });
      continue;
    }

    if (!member.lastSentAt) {
      skipped.push({ name: p.name, reason: "Aucun envoi précédent enregistré." });
      continue;
    }

    const daysSince = (Date.now() - member.lastSentAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < member.campaign.followUpDelayDays) {
      skipped.push({
        name: p.name,
        reason: `Délai non écoulé : ${daysSince.toFixed(1)} jour(s) sur ${member.campaign.followUpDelayDays} requis.`,
      });
      continue;
    }

    if (p.primaryContact) {
      const suppressed = await prisma.suppression.findFirst({
        where: { email: p.primaryContact.email.toLowerCase() },
      });
      if (suppressed) {
        skipped.push({ name: p.name, reason: "Présent en liste d'opposition." });
        continue;
      }
    }

    candidates.push({
      prospectId: p.id,
      prospectName: p.name,
      campaignId: member.campaignId,
      nextStep: member.sequenceStep + 1,
      lastSentAt: member.lastSentAt,
      daysSince,
    });
  }

  return { candidates, skipped };
}

/** Prepare les relances (generation + attente d'approbation). */
export async function prepareFollowUps(campaignId?: string) {
  const { candidates, skipped } = await findFollowUpCandidates(campaignId);
  let prepared = 0;

  for (const candidate of candidates) {
    try {
      const email = await generateEmail(candidate.prospectId, {
        campaignId: candidate.campaignId,
        step: candidate.nextStep,
      });
      if (email.verification.passed) {
        await prisma.campaignMember.updateMany({
          where: { campaignId: candidate.campaignId, prospectId: candidate.prospectId },
          data: { status: "READY", sequenceStep: candidate.nextStep },
        });
        prepared += 1;
      }
    } catch {
      skipped.push({ name: candidate.prospectName, reason: "Génération de la relance impossible." });
    }
  }

  await logActivity({
    actor: "SYSTEM",
    module: "CAMPAIGN",
    action: "campaign.followup",
    summary: `Relances préparées : ${prepared} — ${skipped.length} prospect(s) écarté(s).`,
    details: { prepared, skipped: skipped.slice(0, 20) },
  });

  return { prepared, skipped };
}
