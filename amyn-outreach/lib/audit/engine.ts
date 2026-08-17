// ---------------------------------------------------------------------------
// MOTEUR D'AUDIT
//
// Deroulement :
//   1. robots.txt  — si l'exploration est interdite, on s'arrete. Honnetement.
//   2. page d'accueil
//   3. pages utiles decouvertes (contact, mentions legales, reservation)
//   4. execution des regles, dans l'ordre
//   5. rapport
//
// Le moteur REFUSE tout resultat incoherent : un `isProblem: true` sans
// verdict VERIFIED, ou sans type/titre, est degrade en UNVERIFIED et signale.
// C'est la garantie technique du « aucune affirmation sans preuve ».
// ---------------------------------------------------------------------------

import { parsePage, allLinks, resolveUrl, isInternal } from "./html";
import {
  fetchPage,
  fetchRobots,
  isPathAllowed,
  normalizeUrl,
  probeUrl,
  LIMITS,
  USER_AGENT,
  type FetchStats,
} from "./http";
import { ALL_RULES } from "./rules";
import type { AuditContext, AuditReport, FetchedPage, ProspectInput } from "./types";

export const ENGINE_VERSION = "1.0.0";

/** Pages secondaires recherchees, par ordre d'interet. */
const USEFUL_PAGE_PATTERNS: Array<{ test: RegExp; priority: number }> = [
  { test: /mentions?[-_]?l[ée]gales?/i, priority: 1 },
  { test: /contact/i, priority: 2 },
  { test: /reservation|reserver|rendez-?vous|booking|rdv/i, priority: 3 },
  { test: /(^|\/)(a-propos|about|qui-sommes-nous)/i, priority: 4 },
];

function pickUsefulLinks(home: FetchedPage, homeParsed: ReturnType<typeof parsePage>): string[] {
  const base = home.finalUrl;
  const scored: Array<{ url: string; priority: number }> = [];

  for (const link of allLinks(homeParsed)) {
    const url = resolveUrl(link.href, base);
    if (!url || !url.startsWith("http") || !isInternal(url, base) || url === base) continue;

    const haystack = `${url} ${link.text}`;
    for (const pattern of USEFUL_PAGE_PATTERNS) {
      if (pattern.test.test(haystack)) {
        scored.push({ url: url.split("#")[0], priority: pattern.priority });
        break;
      }
    }
  }

  const seen = new Set<string>();
  return scored
    .sort((a, b) => a.priority - b.priority)
    .map((s) => s.url)
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)))
    .slice(0, LIMITS.maxPages - 1);
}

export async function runAudit(prospect: ProspectInput): Promise<AuditReport> {
  const startedAt = new Date();
  const stats: FetchStats = { requests: 0, bytes: 0 };
  const checks: AuditReport["checks"] = [];

  let home: FetchedPage | null = null;
  const pages: FetchedPage[] = [];
  let robotsBlocked = false;
  let robotsNote: string | undefined;

  const websiteUrl = prospect.website ? normalizeUrl(prospect.website) : null;

  if (websiteUrl) {
    const origin = new URL(websiteUrl).origin;
    const robots = await fetchRobots(origin, stats);
    robotsNote = robots.note;

    if (robots.disallowAll) {
      robotsBlocked = true;
    } else {
      home = await fetchPage(websiteUrl, stats);

      if (home.ok && home.html) {
        const homeParsed = parsePage(home);
        const candidates = pickUsefulLinks(home, homeParsed).filter((u) =>
          isPathAllowed(robots, u),
        );
        for (const url of candidates) {
          const page = await fetchPage(url, stats);
          if (page.ok && page.html) pages.push(page);
        }
      }
    }
  }

  const allPages = [home, ...pages].filter((p): p is FetchedPage => Boolean(p?.ok && p.html));
  const parsed = allPages.map(parsePage);
  const parsedHome = home?.ok && home.html ? parsed.find((p) => p.page === home) ?? null : null;

  const ctx: AuditContext = {
    prospect,
    parsed,
    parsedHome,
    home,
    pages,
    allPages,
    combinedText: parsed.map((p) => p.text).join(" \n ").toLowerCase(),
    siteReachable: Boolean(home?.ok),
    robotsBlocked,
    robotsNote,
    probe: (url) => probeUrl(url, stats),
    startedAt,
    userAgent: USER_AGENT,
  };

  // --- Exploration interdite : on le dit, on n'invente rien -----------------
  if (robotsBlocked) {
    return {
      status: "BLOCKED_BY_ROBOTS",
      note: robotsNote,
      checks: [
        {
          ruleId: "robots.policy",
          ruleLabel: "Politique robots.txt",
          category: "ACCESSIBILITE",
          verdict: "UNVERIFIED",
          confidence: "HIGH",
          isProblem: false,
          observation:
            "Le fichier robots.txt du site interdit l'exploration automatique (Disallow: /). L'audit a été interrompu et aucun constat n'est formulé sur ce site.",
          method: `Lecture de ${new URL(websiteUrl!).origin}/robots.txt avec l'agent ${USER_AGENT}.`,
          evidence: { targetUrl: `${new URL(websiteUrl!).origin}/robots.txt` },
        },
      ],
      stats: {
        pagesFetched: 0,
        bytesFetched: stats.bytes,
        requestsMade: stats.requests,
        rulesRun: 0,
        verified: 0,
        unverified: 1,
        notFound: 0,
        problems: 0,
        durationMs: Date.now() - startedAt.getTime(),
      },
    };
  }

  // --- Execution des regles ------------------------------------------------
  for (const rule of ALL_RULES) {
    if (!rule.applicable(ctx)) {
      checks.push({
        ruleId: rule.id,
        ruleLabel: rule.label,
        category: rule.category,
        verdict: "UNVERIFIED",
        confidence: "LOW",
        isProblem: false,
        observation:
          rule.notApplicableReason?.(ctx) ??
          "Les données nécessaires à cette vérification ne sont pas disponibles.",
        method: "Règle non exécutée : conditions préalables non réunies.",
      });
      continue;
    }

    try {
      const result = await rule.run(ctx);

      // GARDE-FOU : un probleme doit etre prouve, type et titre.
      if (result.isProblem && (result.verdict === "UNVERIFIED" || !result.issueType || !result.title)) {
        checks.push({
          ...result,
          isProblem: false,
          verdict: "UNVERIFIED",
          confidence: "LOW",
          observation: `${result.observation} [Signalement refusé par le moteur : un problème doit être VERIFIED ou NOT_FOUND et porter un type et un titre.]`,
          ruleId: rule.id,
          ruleLabel: rule.label,
          category: rule.category,
        });
        continue;
      }

      checks.push({ ...result, ruleId: rule.id, ruleLabel: rule.label, category: rule.category });
    } catch (err) {
      checks.push({
        ruleId: rule.id,
        ruleLabel: rule.label,
        category: rule.category,
        verdict: "UNVERIFIED",
        confidence: "LOW",
        isProblem: false,
        observation: `La vérification a échoué : ${(err as Error).message}`,
        method: "Exécution de la règle interrompue par une erreur technique.",
      });
    }
  }

  const verified = checks.filter((c) => c.verdict === "VERIFIED").length;
  const unverified = checks.filter((c) => c.verdict === "UNVERIFIED").length;
  const notFound = checks.filter((c) => c.verdict === "NOT_FOUND").length;
  const problems = checks.filter((c) => c.isProblem).length;

  // Un audit n'est COMPLETE que si le site a vraiment ete analyse.
  let status: AuditReport["status"] = "COMPLETE";
  let note = robotsNote;

  if (!websiteUrl) {
    status = "COMPLETE";
    note = "Aucun site à analyser : le diagnostic porte sur les seules sources disponibles.";
  } else if (!home) {
    status = "FAILED";
    note = "La page d'accueil n'a pas pu être récupérée.";
  } else if (!home.ok) {
    status = "INCOMPLETE";
    note = `Le site n'a pas répondu correctement (${home.errorCode ?? `HTTP ${home.status}`}) : seules les vérifications ne nécessitant pas le contenu du site ont été effectuées.`;
  } else if (unverified > checks.length / 2) {
    status = "INCOMPLETE";
    note = "Plus de la moitié des vérifications n'ont pas pu conclure.";
  }

  return {
    status,
    note,
    checks,
    stats: {
      pagesFetched: allPages.length,
      bytesFetched: stats.bytes,
      requestsMade: stats.requests,
      rulesRun: checks.length,
      verified,
      unverified,
      notFound,
      problems,
      durationMs: Date.now() - startedAt.getTime(),
    },
  };
}
