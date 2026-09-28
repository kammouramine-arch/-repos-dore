/**
 * Identité du site : ce qui ne change qu'avec la marque elle-même.
 *
 * Aucune donnée légale ici (voir `legal.ts`) : ce fichier ne contient que
 * ce qui est public et vérifié.
 */

export const site = {
  name: "AMYN",
  legalBrand: "AMYN Agency",
  domain: "amyn.agency",
  url: "https://amyn.agency",
  email: "contact@amyn.agency",
  locale: "fr_FR",
  /* Phrase de positionnement, reprise par le SEO et le pied de page. */
  tagline:
    "Sites web, applications et outils digitaux conçus autour de la façon dont votre entreprise fonctionne réellement.",
} as const;

/**
 * Réseaux sociaux. Un lien vide n'est pas affiché : on n'invente pas de
 * compte, et on ne publie pas de lien mort.
 */
export const social: { label: string; href: string }[] = [
  // { label: "LinkedIn", href: "https://www.linkedin.com/company/…" },
  // { label: "Instagram", href: "https://www.instagram.com/…" },
];

/* Les trois actions du site, dans cet ordre de priorité. */
export const cta = {
  firstLook: { label: "Recevoir un premier aperçu", href: "/premier-apercu" },
  project: { label: "Parler de votre projet", href: "/contact" },
  services: { label: "Découvrir nos services", href: "/services" },
} as const;

export const mainNav = [
  { label: "Services", href: "/services" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Méthode", href: "/methode" },
  { label: "À propos", href: "/a-propos" },
] as const;

export const legalNav = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "Cookies", href: "/cookies" },
  { label: "Conditions des services", href: "/conditions-services" },
] as const;
