import type { Locale } from "./config.ts";
import { href } from "./routes.ts";
import { getUi } from "./ui.ts";

export type NavItem = { label: string; href: string; accent?: boolean };

/**
 * Navigation principale, dans une langue. Revenue OS, l'offre phare, vient
 * en premier avec la touche de laiton (`accent`) ; les capacités (sites,
 * applications, automatisation…) et les autres offres suivent. La méthode
 * reste accessible depuis le pied de page.
 */
export function mainNav(locale: Locale): NavItem[] {
  const n = getUi(locale).nav;
  return [
    { label: n.revenueOs, href: href("revenueOs", locale), accent: true },
    { label: n.services, href: href("services", locale) },
    { label: n.work, href: href("work", locale) },
    { label: n.proofsprint, href: href("proofsprint", locale) },
    { label: n.about, href: href("about", locale) },
  ];
}

/**
 * Actions commerciales. Le Revenue Audit est l'objectif principal (en-tête,
 * accueil, Revenue OS) ; le premier aperçu reste la porte d'entrée des
 * services pour les petites entreprises (pages de service).
 */
export function ctas(locale: Locale) {
  const c = getUi(locale).cta;
  return {
    firstLook: { label: c.firstLook, href: href("firstLook", locale) },
    revenueAudit: { label: c.revenueAudit, short: c.revenueAuditShort, href: href("revenueAudit", locale) },
    revenueOs: { label: c.revenueOs, href: href("revenueOs", locale) },
    services: { label: c.services, href: href("services", locale) },
    work: { label: c.work, href: href("work", locale) },
  };
}
