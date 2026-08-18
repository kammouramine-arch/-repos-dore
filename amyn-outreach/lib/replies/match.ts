// ---------------------------------------------------------------------------
// RATTACHEMENT D'UNE REPONSE A UN PROSPECT
//
// REGLE : on ne devine pas. Un rattachement s'appuie toujours sur une trace
// enregistree — une adresse presente dans une fiche, ou une adresse a laquelle
// nous avons reellement ecrit.
//
// Le rattachement par domaine est le seul indice indirect : il n'est retenu
// que si UN SEUL prospect correspond au domaine, et il est marque comme tel
// pour rester relisable.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";

export type MatchResult = {
  prospectId: string | null;
  /** CONTACT | SEND_LOG | CLIENT | DOMAIN | NONE */
  matchedBy: string;
  campaignId?: string;
  reason: string;
};

const NO_MATCH: MatchResult = {
  prospectId: null,
  matchedBy: "NONE",
  reason: "Aucune trace de cette adresse : ni contact enregistré, ni envoi effectué.",
};

/** Domaines mutualises : un domaine partage ne prouve rien. */
const SHARED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "outlook.fr", "hotmail.com", "hotmail.fr",
  "live.fr", "live.com", "yahoo.com", "yahoo.fr", "orange.fr", "wanadoo.fr", "free.fr",
  "sfr.fr", "laposte.net", "bbox.fr", "numericable.fr", "icloud.com", "me.com", "protonmail.com",
]);

export async function matchProspect(fromEmail: string): Promise<MatchResult> {
  const email = fromEmail.trim().toLowerCase();
  if (!email.includes("@")) return NO_MATCH;

  // 1. Adresse enregistree dans une fiche prospect — preuve directe.
  const contact = await prisma.contact.findFirst({
    where: { email },
    select: { prospectId: true },
  });
  if (contact) {
    return {
      prospectId: contact.prospectId,
      matchedBy: "CONTACT",
      reason: `Adresse ${email} enregistrée dans la fiche prospect.`,
    };
  }

  // 2. Adresse a laquelle nous avons reellement ecrit — preuve directe.
  const sendLog = await prisma.sendLog.findFirst({
    where: { toEmail: email },
    orderBy: { createdAt: "desc" },
    select: { prospectId: true, campaignId: true },
  });
  if (sendLog) {
    return {
      prospectId: sendLog.prospectId,
      matchedBy: "SEND_LOG",
      campaignId: sendLog.campaignId ?? undefined,
      reason: `Un email a été adressé à ${email} depuis AMYN Outreach.`,
    };
  }

  // 3. Adresse de contact d'un client signe.
  const client = await prisma.client.findFirst({
    where: { contactEmail: email },
    select: { prospectId: true, companyName: true },
  });
  if (client?.prospectId) {
    return {
      prospectId: client.prospectId,
      matchedBy: "CLIENT",
      reason: `Adresse de contact du client ${client.companyName}.`,
    };
  }

  // 4. Dernier recours : le domaine, et seulement s'il est sans ambiguite.
  const domain = email.split("@")[1] ?? "";
  if (!domain || SHARED_DOMAINS.has(domain)) return NO_MATCH;

  const sameDomain = await prisma.prospect.findMany({
    where: { website: { contains: domain }, isDemo: false },
    select: { id: true, name: true },
    take: 2,
  });
  if (sameDomain.length === 1) {
    return {
      prospectId: sameDomain[0].id,
      matchedBy: "DOMAIN",
      reason: `Le domaine ${domain} correspond au site de ${sameDomain[0].name}, et à lui seul.`,
    };
  }
  if (sameDomain.length > 1) {
    return {
      ...NO_MATCH,
      reason: `Le domaine ${domain} correspond à plusieurs prospects : rattachement refusé plutôt que deviné.`,
    };
  }

  return NO_MATCH;
}
