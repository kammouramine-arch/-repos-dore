// ---------------------------------------------------------------------------
// FILE D'APPROBATION — du prospect qualifié à votre relecture
//
// Le dernier chaînon avant vous. Il rassemble les prospects que le pipeline a
// jugés dignes d'être contactés, avec leur email déjà rédigé et vérifié, et
// les place en attente de VOTRE validation.
//
// CE MODULE N'APPROUVE RIEN. Il constitue une liste et s'arrête. L'écriture
// de `approvedAt` n'existe qu'à un seul endroit du code — `approveCampaignMembers`,
// atteignable uniquement par une commande que vous tapez. Aucun automatisme,
// aucun enchaînement, aucun cas particulier ne mène jusque-là.
//
// Les prospects sont retenus dans l'ordre du score : si vous n'en approuvez
// que cinq, ce sont les cinq meilleurs, pas les cinq premiers arrivés.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getPolicy } from "@/lib/policy";
import { createCampaign, addProspectsToCampaign, prepareCampaign } from "./index";

export type QueueResult = {
  campaignId: string;
  campaignSlug: string;
  campaignName: string;
  /** Prospects qualifiés examinés. */
  examines: number;
  /** Ajoutés à la file. */
  ajoutes: number;
  /** Écartés avant d'entrer, avec le motif. */
  ecartes: Array<{ nom: string; raison: string }>;
  /** Emails prêts après préparation. */
  prets: number;
  bloques: number;
  motifsBlocage: Record<string, number>;
  commandeApprobation: string;
};

/**
 * Constitue la file d'approbation à partir des prospects qualifiés.
 *
 * Idempotent : un prospect déjà membre d'une campagne active n'est pas
 * réintroduit, et relancer la commande ne crée pas de doublon.
 */
export async function buildApprovalQueue(
  options: { max?: number; nom?: string; campaignId?: string } = {},
): Promise<QueueResult> {
  const policy = await getPolicy();
  const max = options.max ?? 50;
  const ecartes: QueueResult["ecartes"] = [];

  // Les contrôles complets tournent de toute façon avant chaque envoi. Ceux
  // d'ici servent à ne pas encombrer votre file de prospects qui seraient
  // bloqués de toute manière — relire vingt emails dont quinze ne partiront
  // jamais fait perdre du temps et de la confiance.
  const candidats = await prisma.prospect.findMany({
    where: {
      isDemo: false,
      qualification: "QUALIFIED",
      status: { notIn: ["OPTOUT", "BLOCKED", "WON", "LOST", "CONTACTED"] },
      primaryContactId: { not: null },
      emailDrafts: { some: { isActive: true, verificationPassed: true } },
      campaignMembers: { none: { status: { in: ["PENDING", "READY", "APPROVED", "SENT"] } } },
    },
    select: {
      id: true, name: true, overallScore: true, lastInteractionAt: true,
      primaryContact: { select: { email: true } },
    },
    orderBy: [{ overallScore: "desc" }, { createdAt: "asc" }],
    take: max * 3,
  });

  const retenus: string[] = [];
  const maintenant = Date.now();
  const cooldownMs = policy.recontactCooldownDays * 24 * 3600_000;

  for (const p of candidats) {
    if (retenus.length >= max) break;

    // Opposition : vérifiée ici ET avant l'envoi. La redondance est
    // délibérée — c'est le seul contrôle qu'on ne veut jamais voir manquer.
    const email = p.primaryContact?.email?.toLowerCase();
    if (!email) {
      ecartes.push({ nom: p.name, raison: "Aucune adresse retenue." });
      continue;
    }
    const domaine = email.split("@")[1] ?? "";
    const oppose = await prisma.suppression.findFirst({
      where: { OR: [{ email }, { domain: domaine }] },
      select: { reason: true },
    });
    if (oppose) {
      ecartes.push({ nom: p.name, raison: `Opposition enregistrée (${oppose.reason}).` });
      continue;
    }

    if (p.lastInteractionAt && maintenant - p.lastInteractionAt.getTime() < cooldownMs) {
      const jours = Math.ceil(
        (cooldownMs - (maintenant - p.lastInteractionAt.getTime())) / (24 * 3600_000),
      );
      ecartes.push({ nom: p.name, raison: `Contacté récemment : encore ${jours} jour(s) de délai.` });
      continue;
    }

    retenus.push(p.id);
  }

  const campagne = options.campaignId
    ? await prisma.campaign.findUniqueOrThrow({ where: { id: options.campaignId } })
    : await createCampaign({
        name:
          options.nom ??
          `File d'approbation — ${new Date().toLocaleDateString("fr-FR")}`,
        targetCriteria: { source: "prospection nationale", qualification: "QUALIFIED" },
      });

  if (retenus.length > 0) {
    await addProspectsToCampaign(campagne.id, retenus);
  }
  const prep = retenus.length > 0
    ? await prepareCampaign(campagne.id)
    : { prepared: 0, blocked: 0, blockedReasons: {} as Record<string, number> };

  const resultat: QueueResult = {
    campaignId: campagne.id,
    campaignSlug: campagne.slug,
    campaignName: campagne.name,
    examines: candidats.length,
    ajoutes: retenus.length,
    ecartes,
    prets: prep.prepared,
    bloques: prep.blocked,
    motifsBlocage: prep.blockedReasons,
    commandeApprobation: `npm run amyn -- campaign approve ${campagne.slug}`,
  };

  await logActivity({
    actor: "AGENT",
    module: "CAMPAIGN",
    action: "campaign.queue",
    entityType: "Campaign",
    entityId: campagne.id,
    summary:
      `File d'approbation « ${campagne.name} » : ${resultat.ajoutes} prospect(s) ajouté(s), ` +
      `${resultat.prets} email(s) prêt(s), ${resultat.bloques} bloqué(s), ${ecartes.length} écarté(s).`,
    details: { ...resultat, ecartes: ecartes.slice(0, 20) },
  });

  return resultat;
}

/** Ce qui attend votre relecture, toutes campagnes confondues. */
export async function approvalQueueStatus() {
  const [enAttente, approuves, campagnes] = await Promise.all([
    prisma.campaignMember.count({ where: { status: "READY" } }),
    prisma.campaignMember.count({ where: { status: "APPROVED" } }),
    prisma.campaign.findMany({
      where: { status: { in: ["READY", "ACTIVE"] } },
      select: {
        id: true, name: true, slug: true, status: true,
        members: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    enAttente,
    approuves,
    campagnes: campagnes.map((c) => ({
      slug: c.slug,
      nom: c.name,
      statut: c.status,
      prets: c.members.filter((m) => m.status === "READY").length,
      approuves: c.members.filter((m) => m.status === "APPROVED").length,
      envoyes: c.members.filter((m) => m.status === "SENT").length,
      bloques: c.members.filter((m) => m.status === "BLOCKED").length,
    })),
  };
}
