// ---------------------------------------------------------------------------
// Couche reseau du moteur d'audit.
//
// Principes :
//   • on s'identifie honnetement (User-Agent explicite)
//   • on respecte robots.txt
//   • on limite : nombre de pages, taille, duree, delai entre requetes
//   • on MESURE tout (ms, octets, codes) : ce sont les preuves
// ---------------------------------------------------------------------------

import type { FetchedPage } from "./types";

export const USER_AGENT =
  "AmynOutreachBot/1.0 (+audit de presence en ligne; contact@amyn.agency)";

export const LIMITS = {
  /** Nombre maximum de pages telechargees par audit. */
  maxPages: 6,
  /** Taille maximale d'une page, en octets. */
  maxBytes: 2_000_000,
  /** Delai d'attente d'une requete, en millisecondes. */
  timeoutMs: 15_000,
  /** Delai minimum entre deux requetes vers le meme hote (politesse). */
  politenessDelayMs: 800,
} as const;

/**
 * Dernier appel par HOTE, et non un compteur unique pour tout le web.
 *
 * La politesse se doit a un serveur, pas a Internet. Un compteur global
 * imposait 800 ms entre deux requetes meme vers deux entreprises differentes :
 * a l'echelle nationale, cela plafonnait l'enrichissement a environ 75
 * pages par minute sans proteger personne davantage. Par hote, chaque serveur
 * garde son repit et le debit global suit le nombre de sites visites.
 */
const dernierAppelParHote = new Map<string, number>();

/** Evite que la table grossisse indefiniment sur un balayage national. */
const MAX_HOTES_SUIVIS = 5_000;

function hoteDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function bePolite(url: string) {
  const hote = hoteDe(url);
  const dernier = dernierAppelParHote.get(hote) ?? 0;
  const elapsed = Date.now() - dernier;
  if (elapsed < LIMITS.politenessDelayMs) {
    await new Promise((r) => setTimeout(r, LIMITS.politenessDelayMs - elapsed));
  }

  if (dernierAppelParHote.size >= MAX_HOTES_SUIVIS) {
    // Les hotes les plus anciens ne seront pas revisites de sitot : leur
    // delai est de toute facon ecoule.
    const limite = Date.now() - LIMITS.politenessDelayMs;
    for (const [h, t] of dernierAppelParHote) {
      if (t < limite) dernierAppelParHote.delete(h);
    }
  }

  dernierAppelParHote.set(hote, Date.now());
}

/** Normalise une URL saisie a la main (ajoute https:// si absent). */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

export type FetchStats = { requests: number; bytes: number };

/**
 * Telecharge une page en mesurant tout. Ne leve jamais : une erreur reseau
 * est un RESULTAT (avec son code), pas une exception a masquer.
 */
export async function fetchPage(url: string, stats: FetchStats): Promise<FetchedPage> {
  await bePolite(url);
  const startedAt = Date.now();
  stats.requests += 1;

  const base: FetchedPage = {
    requestedUrl: url,
    finalUrl: url,
    ok: false,
    status: 0,
    statusText: "",
    contentType: "",
    html: "",
    bytes: 0,
    durationMs: 0,
    redirected: false,
    headers: {},
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Lecture bornee : on n'avale jamais une page geante.
    const buffer = await response.arrayBuffer();
    const truncated = buffer.byteLength > LIMITS.maxBytes;
    const bytes = buffer.byteLength;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      truncated ? buffer.slice(0, LIMITS.maxBytes) : buffer,
    );

    clearTimeout(timer);
    stats.bytes += bytes;

    return {
      ...base,
      finalUrl: response.url || url,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: headers["content-type"] ?? "",
      html,
      bytes,
      durationMs: Date.now() - startedAt,
      redirected: (response.url || url) !== url,
      headers,
    };
  } catch (err) {
    clearTimeout(timer);
    const error = err as Error & { cause?: { code?: string } };
    const aborted = error.name === "AbortError" || error.name === "TimeoutError";
    return {
      ...base,
      durationMs: Date.now() - startedAt,
      error: aborted ? `Delai depasse apres ${LIMITS.timeoutMs} ms` : error.message,
      // `cause.code` est declare comme une chaine mais n'en est pas toujours
      // une : selon la couche reseau, Node y met parfois un code numerique.
      // Le type mentait, et tout appelant qui faisait confiance a la
      // declaration — un `.startsWith()`, par exemple — plantait sur une
      // simple erreur DNS.
      errorCode: aborted ? "TIMEOUT" : String(error.cause?.code ?? "NETWORK_ERROR"),
    };
  }
}

/** Requete legere pour verifier qu'une URL repond (verification de lien). */
export async function probeUrl(
  url: string,
  stats: FetchStats,
): Promise<{ status: number; ok: boolean; error?: string }> {
  await bePolite(url);
  stats.requests += 1;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.timeoutMs);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    // Certains serveurs refusent HEAD : on retente en GET.
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
    }
    clearTimeout(timer);
    return { status: response.status, ok: response.ok };
  } catch (err) {
    clearTimeout(timer);
    return { status: 0, ok: false, error: (err as Error).message };
  }
}

// --- robots.txt -------------------------------------------------------------

export type RobotsPolicy = {
  fetched: boolean;
  disallowAll: boolean;
  disallowed: string[];
  note: string;
};

/**
 * Lecture minimale mais correcte de robots.txt : on retient les regles du
 * groupe le plus specifique qui nous concerne (notre UA, sinon `*`).
 */
export async function fetchRobots(origin: string, stats: FetchStats): Promise<RobotsPolicy> {
  const url = new URL("/robots.txt", origin).toString();
  const page = await fetchPage(url, stats);

  if (!page.ok || !page.html.trim()) {
    return {
      fetched: false,
      disallowAll: false,
      disallowed: [],
      note: page.ok
        ? "robots.txt vide : exploration autorisee par defaut."
        : `robots.txt absent ou inaccessible (HTTP ${page.status || page.errorCode}) : exploration autorisee par defaut.`,
    };
  }

  const lines = page.html.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  const groups: Array<{ agents: string[]; disallow: string[] }> = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  let previousWasAgent = false;

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      if (!current || !previousWasAgent) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      previousWasAgent = true;
    } else if (key === "disallow" && current) {
      if (value) current.disallow.push(value);
      previousWasAgent = false;
    } else {
      previousWasAgent = false;
    }
  }

  const ourName = "amynoutreachbot";
  const specific = groups.find((g) => g.agents.some((a) => ourName.includes(a) && a !== "*"));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const applicable = specific ?? wildcard;

  if (!applicable) {
    return {
      fetched: true,
      disallowAll: false,
      disallowed: [],
      note: "robots.txt present, aucune regle applicable a notre agent.",
    };
  }

  const disallowAll = applicable.disallow.includes("/");
  return {
    fetched: true,
    disallowAll,
    disallowed: applicable.disallow,
    note: disallowAll
      ? "robots.txt interdit l'exploration du site (Disallow: /). Audit interrompu."
      : `robots.txt present : ${applicable.disallow.length} chemin(s) interdit(s), respectes.`,
  };
}

export function isPathAllowed(policy: RobotsPolicy, url: string): boolean {
  if (!policy.fetched) return true;
  if (policy.disallowAll) return false;
  try {
    const path = new URL(url).pathname;
    return !policy.disallowed.some((rule) => path.startsWith(rule));
  } catch {
    return true;
  }
}
