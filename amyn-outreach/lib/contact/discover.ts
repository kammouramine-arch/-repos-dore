// ---------------------------------------------------------------------------
// DECOUVERTE D'EMAIL PROFESSIONNEL PUBLIC
//
// REGLE ABSOLUE, appliquee par le code et non par une consigne :
// on ne construit JAMAIS une adresse. On ne collecte que ce qui est
// litteralement ecrit sur une page publique, et on garde l'URL + l'extrait.
//
// Ordre de recherche (du plus fiable au moins fiable) :
//   1. Mentions legales — obligatoires en France, source la plus fiable
//   2. Page contact
//   3. Lien mailto: n'importe ou sur le site
//
// Si rien n'est trouve : le prospect est BLOQUE. Il ne passera pas en READY.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { fetchPage, normalizeUrl, type FetchStats } from "@/lib/audit/http";
import { parsePage, allLinks, resolveUrl, isInternal, snippet } from "@/lib/audit/html";
import { logActivity } from "@/lib/activity";

/** Prefixes consideres comme generiques : ce ne sont pas des donnees personnelles. */
const GENERIC_PREFIXES = [
  "contact", "info", "infos", "bonjour", "hello", "accueil", "commercial",
  "rdv", "reservation", "reservations", "salon", "boutique", "atelier",
  "direction", "secretariat", "administration", "admin", "service",
];

/** Adresses techniques a ignorer : ce ne sont pas des contacts commerciaux. */
const IGNORED_PREFIXES = [
  "no-reply", "noreply", "postmaster", "abuse", "webmaster", "hostmaster",
  "mailer-daemon", "bounce", "notification", "notifications",
];

const IGNORED_DOMAINS = [
  "example.com", "example.org", "sentry.io", "wordpress.com", "wixpress.com",
  "godaddy.com", "cloudflare.com", "gstatic.com", "googleapis.com",
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;

export function isGenericAddress(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return GENERIC_PREFIXES.some((p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}-`));
}

export function validateEmailSyntax(email: string): {
  status: "SYNTAX_OK" | "SYNTAX_INVALID" | "ROLE_ACCOUNT";
  note?: string;
} {
  const strict = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  if (!strict.test(email)) return { status: "SYNTAX_INVALID", note: "Format d'adresse invalide." };

  const [local, domain] = email.toLowerCase().split("@");
  if (IGNORED_PREFIXES.some((p) => local.startsWith(p))) {
    return { status: "ROLE_ACCOUNT", note: "Adresse technique, non exploitable commercialement." };
  }
  if (IGNORED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return { status: "SYNTAX_INVALID", note: `Domaine non exploitable : ${domain}` };
  }
  return { status: "SYNTAX_OK" };
}

export type DiscoveredContact = {
  email: string;
  isGeneric: boolean;
  discoveryMethod: "LEGAL_NOTICE" | "WEBSITE_CONTACT" | "WEBSITE_MAILTO";
  sourceUrl: string;
  sourceSnippet: string;
};

function classifyPage(url: string): DiscoveredContact["discoveryMethod"] {
  if (/mentions?[-_]?l[ée]gales?|legal|cgv|cgu/i.test(url)) return "LEGAL_NOTICE";
  if (/contact/i.test(url)) return "WEBSITE_CONTACT";
  return "WEBSITE_MAILTO";
}

/** Extrait les adresses litteralement presentes sur une page. */
function extractFromPage(html: string, text: string, url: string): DiscoveredContact[] {
  const found = new Map<string, DiscoveredContact>();
  const method = classifyPage(url);

  // 1. Liens mailto: — la preuve la plus nette
  const mailtoRe = /href=["']mailto:([^"'?]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = mailtoRe.exec(html)) !== null) {
    const email = decodeURIComponent(m[1]).trim().toLowerCase();
    if (!found.has(email)) {
      found.set(email, {
        email,
        isGeneric: isGenericAddress(email),
        discoveryMethod: method,
        sourceUrl: url,
        sourceSnippet: snippet(m[0], 120),
      });
    }
  }

  // 2. Adresses ecrites en clair dans le texte visible
  const matches = text.match(EMAIL_RE) ?? [];
  for (const raw of matches) {
    const email = raw.trim().toLowerCase();
    if (found.has(email)) continue;
    const idx = text.indexOf(raw);
    found.set(email, {
      email,
      isGeneric: isGenericAddress(email),
      discoveryMethod: method,
      sourceUrl: url,
      sourceSnippet: snippet(text.slice(Math.max(0, idx - 60), idx + raw.length + 60), 160),
    });
  }

  return [...found.values()];
}

/** Priorite : mentions legales > contact > mailto ; generique > nominatif. */
function rank(c: DiscoveredContact): number {
  const methodScore = { LEGAL_NOTICE: 0, WEBSITE_CONTACT: 1, WEBSITE_MAILTO: 2 }[c.discoveryMethod];
  return methodScore * 10 + (c.isGeneric ? 0 : 5);
}

export async function discoverContacts(prospectId: string): Promise<{
  found: DiscoveredContact[];
  saved: number;
  blocked: boolean;
  reason?: string;
}> {
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error(`Prospect introuvable : ${prospectId}`);

  const websiteUrl = prospect.website ? normalizeUrl(prospect.website) : null;
  if (!websiteUrl) {
    await blockProspect(prospectId, "Aucun site web : impossible de trouver un email public.");
    return { found: [], saved: 0, blocked: true, reason: "Aucun site web." };
  }

  const stats: FetchStats = { requests: 0, bytes: 0 };
  const home = await fetchPage(websiteUrl, stats);

  if (!home.ok || !home.html) {
    await blockProspect(
      prospectId,
      `Site inaccessible (${home.errorCode ?? `HTTP ${home.status}`}) : aucun email public récupérable.`,
    );
    return {
      found: [],
      saved: 0,
      blocked: true,
      reason: `Site inaccessible : ${home.errorCode ?? home.status}`,
    };
  }

  const homeParsed = parsePage(home);
  const candidates: DiscoveredContact[] = extractFromPage(
    home.html,
    homeParsed.text,
    home.finalUrl,
  );

  // Pages prioritaires : mentions legales puis contact
  const targets = Array.from(
    new Set(
      allLinks(homeParsed)
        .filter((l) => /mentions?[-_]?l[ée]gales?|contact|legal/i.test(`${l.href} ${l.text}`))
        .map((l) => resolveUrl(l.href, home.finalUrl))
        .filter((u): u is string => u !== null)
        .filter((u) => u.startsWith("http") && isInternal(u, home.finalUrl))
        .map((u) => u.split("#")[0]),
    ),
  ).slice(0, 3);

  for (const url of targets) {
    const page = await fetchPage(url, stats);
    if (!page.ok || !page.html) continue;
    const parsed = parsePage(page);
    candidates.push(...extractFromPage(page.html, parsed.text, page.finalUrl));
  }

  // Deduplication + filtrage : on ne garde que ce qui est exploitable
  const unique = new Map<string, DiscoveredContact>();
  for (const c of candidates) {
    const validation = validateEmailSyntax(c.email);
    if (validation.status !== "SYNTAX_OK") continue;
    const existing = unique.get(c.email);
    if (!existing || rank(c) < rank(existing)) unique.set(c.email, c);
  }

  const found = [...unique.values()].sort((a, b) => rank(a) - rank(b));

  if (found.length === 0) {
    await blockProspect(
      prospectId,
      `Aucune adresse email publique trouvée sur ${1 + targets.length} page(s) analysée(s). Aucune adresse n'a été devinée.`,
    );
    await logActivity({
      actor: "SYSTEM",
      module: "CONTACT",
      action: "contact.discover",
      entityType: "Prospect",
      entityId: prospectId,
      summary: `Aucun email public trouvé pour ${prospect.name}. Prospect bloqué — aucune adresse devinée.`,
      details: { pagesChecked: [home.finalUrl, ...targets] },
      level: "WARN",
    });
    return {
      found: [],
      saved: 0,
      blocked: true,
      reason: "Aucun email public trouvé.",
    };
  }

  let saved = 0;
  for (const [index, contact] of found.entries()) {
    const validation = validateEmailSyntax(contact.email);
    await prisma.contact.upsert({
      where: { prospectId_email: { prospectId, email: contact.email } },
      update: {
        discoveryMethod: contact.discoveryMethod,
        sourceUrl: contact.sourceUrl,
        sourceSnippet: contact.sourceSnippet,
        isGeneric: contact.isGeneric,
        validationStatus: validation.status,
        validationNote: validation.note,
      },
      create: {
        prospectId,
        email: contact.email,
        isGeneric: contact.isGeneric,
        discoveryMethod: contact.discoveryMethod,
        sourceUrl: contact.sourceUrl,
        sourceSnippet: contact.sourceSnippet,
        validationStatus: validation.status,
        validationNote: validation.note,
        isPrimary: index === 0,
      },
    });
    saved += 1;
  }

  const primary = await prisma.contact.findUnique({
    where: { prospectId_email: { prospectId, email: found[0].email } },
  });

  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      primaryContactId: primary?.id,
      blockedReason: null,
      ...(prospect.status === "BLOCKED" ? { status: "AUDITED" } : {}),
    },
  });

  await prisma.source.create({
    data: {
      prospectId,
      kind: found[0].discoveryMethod === "LEGAL_NOTICE" ? "LEGAL_NOTICE" : "WEBSITE",
      label: `Email public trouvé : ${found[0].email}`,
      url: found[0].sourceUrl,
      note: found[0].sourceSnippet,
    },
  });

  await logActivity({
    actor: "SYSTEM",
    module: "CONTACT",
    action: "contact.discover",
    entityType: "Prospect",
    entityId: prospectId,
    summary: `${saved} email(s) public(s) trouvé(s) pour ${prospect.name}. Retenu : ${found[0].email} (${found[0].discoveryMethod}).`,
    details: { found: found.map((f) => ({ email: f.email, method: f.discoveryMethod, url: f.sourceUrl })) },
  });

  return { found, saved, blocked: false };
}

async function blockProspect(prospectId: string, reason: string) {
  const current = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!current) return;
  if (["WON", "OPTOUT", "LOST"].includes(current.status)) return;

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: "BLOCKED", blockedReason: reason },
  });
  await prisma.statusEvent.create({
    data: {
      prospectId,
      fromStatus: current.status,
      toStatus: "BLOCKED",
      reason,
      actor: "SYSTEM",
    },
  });
}
