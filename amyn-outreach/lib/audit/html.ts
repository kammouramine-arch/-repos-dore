// ---------------------------------------------------------------------------
// Aides d'analyse HTML.
//
// Toutes les fonctions retournent des FAITS bruts (presence, compte, extrait).
// Aucune interpretation ici : l'interpretation appartient aux regles, et elle
// doit toujours s'appuyer sur ces faits.
// ---------------------------------------------------------------------------

import { parse, type HTMLElement } from "node-html-parser";
import type { FetchedPage } from "./types";

export type ParsedPage = {
  page: FetchedPage;
  root: HTMLElement;
  /** Texte visible, script/style retires. */
  text: string;
};

export function parsePage(page: FetchedPage): ParsedPage {
  const root = parse(page.html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: { script: false, noscript: false, style: false, pre: true },
  });
  return { page, root, text: root.text.replace(/\s+/g, " ").trim() };
}

/** Coupe un extrait de preuve a une longueur lisible. */
export function snippet(value: string, max = 220): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

/** Retrouve la portion de HTML brut autour d'un motif, pour servir de preuve. */
export function rawSnippetAround(html: string, pattern: RegExp, radius = 90): string | null {
  const match = pattern.exec(html);
  if (!match) return null;
  const start = Math.max(0, match.index - radius);
  const end = Math.min(html.length, match.index + match[0].length + radius);
  return snippet(html.slice(start, end), 260);
}

export function allLinks(parsed: ParsedPage): Array<{ href: string; text: string }> {
  return parsed.root
    .querySelectorAll("a[href]")
    .map((a) => ({ href: a.getAttribute("href") ?? "", text: a.text.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.href.length > 0);
}

/** Resout un href relatif par rapport a la page. */
export function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function isInternal(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).hostname === new URL(baseUrl).hostname;
  } catch {
    return false;
  }
}

/** Cherche un motif dans plusieurs pages et retourne la premiere correspondance. */
export function findInPages(
  pages: ParsedPage[],
  test: (p: ParsedPage) => { found: boolean; snippet?: string } | null,
): { page: ParsedPage; snippet?: string } | null {
  for (const p of pages) {
    const result = test(p);
    if (result?.found) return { page: p, snippet: result.snippet };
  }
  return null;
}

/** Compte les occurrences d'un selecteur sur un ensemble de pages. */
export function countAcross(pages: ParsedPage[], selector: string): number {
  return pages.reduce((sum, p) => sum + p.root.querySelectorAll(selector).length, 0);
}

/** Liste les pages ou un selecteur est present. */
export function pagesWith(pages: ParsedPage[], selector: string): ParsedPage[] {
  return pages.filter((p) => p.root.querySelectorAll(selector).length > 0);
}

// --- Motifs reutilisables ---------------------------------------------------

export const PATTERNS = {
  tel: /^tel:/i,
  mailto: /^mailto:/i,
  whatsapp: /(wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp:\/\/)/i,
  booking:
    /(planity|treatwell|calendly|resalys|guestonline|thefork|lafourchette|zenchef|libro|doctolib|simplybook|acuityscheduling|booksy|rendez-?vous|reserver|reservation|booking|prendre-rdv|rdv)/i,
  socialBooking: /(planity|treatwell|thefork|lafourchette|zenchef|guestonline|doctolib|booksy)/i,
  openingHours:
    /(horaires?|ouvert|ouverture|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i,
  copyrightYear: /(?:©|&copy;|copyright)\s*(?:.*?)((?:19|20)\d{2})/i,
  jqueryVersion: /jquery[.-]?(\d+)\.(\d+)(?:\.(\d+))?(?:\.min)?\.js/i,
  flash: /<(object|embed)[^>]+(application\/x-shockwave-flash|\.swf)/i,
  documentWrite: /document\.write\s*\(/i,
  fixedWidth: /(?:^|[;"'\s])width\s*:\s*(\d{3,4})px/i,
  viewportMeta: /<meta[^>]+name=["']?viewport["']?[^>]*>/i,
} as const;
