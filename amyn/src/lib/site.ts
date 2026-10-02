/**
 * Identité du site : ce qui ne change qu'avec la marque elle-même.
 *
 * Aucune donnée légale ici (voir `legal.ts`) : ce fichier ne contient que
 * ce qui est public et vérifié.
 */

export const site = {
  name: "AMYN",
  /* Nom commercial officiel. « AMYN Agency » reste une formule de
     présentation, jamais l'identité légale. */
  legalBrand: "AMYN",
  domain: "amyn.agency",
  /* Adresse canonique : le domaine nu redirige (308) vers www chez Vercel.
     Canoniques, plan du site et données structurées pointent donc vers la
     version www, jamais vers une redirection. */
  url: "https://www.amyn.agency",
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

/* Navigation, appels à l'action et liens légaux : voir `i18n/nav.ts` et
   `i18n/routes.ts` (une adresse par langue). */
