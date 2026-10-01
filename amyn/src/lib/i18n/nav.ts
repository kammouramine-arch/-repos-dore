import type { Locale } from "./config.ts";
import { href } from "./routes.ts";
import { getUi } from "./ui.ts";

export type NavItem = { label: string; href: string; accent?: boolean };

/**
 * Navigation principale, dans une langue. ProofSprint, offre distincte,
 * vient en dernier et porte une légère touche de laiton (`accent`).
 */
export function mainNav(locale: Locale): NavItem[] {
  const n = getUi(locale).nav;
  return [
    { label: n.services, href: href("services", locale) },
    { label: n.work, href: href("work", locale) },
    { label: n.method, href: href("method", locale) },
    { label: n.about, href: href("about", locale) },
    { label: n.proofsprint, href: href("proofsprint", locale), accent: true },
  ];
}

/**
 * Une seule action commerciale, partout : le premier aperçu. Les autres
 * liens sont des explorations.
 */
export function ctas(locale: Locale) {
  const c = getUi(locale).cta;
  return {
    firstLook: { label: c.firstLook, href: href("firstLook", locale) },
    services: { label: c.services, href: href("services", locale) },
    work: { label: c.work, href: href("work", locale) },
  };
}
