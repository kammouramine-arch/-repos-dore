import { localeFromPath, type Locale } from "./config.ts";

/**
 * Table des adresses, dans les deux langues.
 *
 * Chaque page a une adresse par langue ; les adresses anglaises sont
 * écrites en anglais (`/en/work`, et non `/en/realisations`). Tous les
 * liens internes, le sélecteur de langue, les balises hreflang et le plan
 * du site passent par ce fichier : une adresse se change ici, une seule
 * fois.
 */
export const ROUTES = {
  home: { fr: "/", en: "/en" },
  services: { fr: "/services", en: "/en/services" },
  work: { fr: "/realisations", en: "/en/work" },
  method: { fr: "/methode", en: "/en/method" },
  about: { fr: "/a-propos", en: "/en/about" },
  firstLook: { fr: "/premier-apercu", en: "/en/first-look" },
  legalNotice: { fr: "/mentions-legales", en: "/en/legal-notice" },
  privacy: { fr: "/confidentialite", en: "/en/privacy" },
  terms: { fr: "/conditions-services", en: "/en/terms" },
  cookies: { fr: "/cookies", en: "/en/cookies" },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof ROUTES;

export const href = (key: RouteKey, locale: Locale): string => ROUTES[key][locale];

/**
 * Adresse de chaque service. L'identifiant interne reste le slug français
 * (utilisé par les données, les liens de campagne et le formulaire).
 */
export const SERVICE_SLUGS = {
  "site-web": { fr: "site-web", en: "website" },
  "suivi-demandes-devis": { fr: "suivi-demandes-devis", en: "request-and-quote-tracking" },
  "application-mobile": { fr: "application-mobile", en: "mobile-app" },
  "reservation-en-ligne": { fr: "reservation-en-ligne", en: "online-booking" },
  "google-business": { fr: "google-business", en: "google-business-profile" },
  "onboarding-client": { fr: "onboarding-client", en: "client-onboarding" },
  "portfolio-contenu": { fr: "portfolio-contenu", en: "portfolio-and-content" },
} as const satisfies Record<string, Record<Locale, string>>;

export type ServiceId = keyof typeof SERVICE_SLUGS;

export const servicePath = (id: string, locale: Locale): string => {
  const slugs = SERVICE_SLUGS[id as ServiceId];
  return `${ROUTES.services[locale]}/${slugs ? slugs[locale] : id}`;
};

/** Identifiant interne d'un service à partir de son adresse dans une langue. */
export const serviceIdFromSlug = (slug: string, locale: Locale): ServiceId | undefined =>
  (Object.keys(SERVICE_SLUGS) as ServiceId[]).find((id) => SERVICE_SLUGS[id][locale] === slug);

/** Les réalisations gardent le même slug (nom de marque) dans les deux langues. */
export const projectPath = (slug: string, locale: Locale): string => `${ROUTES.work[locale]}/${slug}`;

/** Adresses d'une même page dans les deux langues. */
export type Alternates = Record<Locale, string>;

export const routeAlternates = (key: RouteKey): Alternates => ({ ...ROUTES[key] });
export const serviceAlternates = (id: string): Alternates => ({
  fr: servicePath(id, "fr"),
  en: servicePath(id, "en"),
});
export const projectAlternates = (slug: string): Alternates => ({
  fr: projectPath(slug, "fr"),
  en: projectPath(slug, "en"),
});

/**
 * Équivalent d'une adresse dans l'autre langue — utilisé par le sélecteur
 * de langue. Une adresse inconnue renvoie vers l'accueil de la langue
 * choisie plutôt que vers une page introuvable.
 */
export function translatePath(pathname: string, target: Locale): string {
  const from = localeFromPath(pathname);
  const clean = pathname.replace(/\/+$/, "") || "/";

  for (const key of Object.keys(ROUTES) as RouteKey[]) {
    if (ROUTES[key][from] === clean) return ROUTES[key][target];
  }

  const servicesBase = `${ROUTES.services[from]}/`;
  if (clean.startsWith(servicesBase)) {
    const id = serviceIdFromSlug(clean.slice(servicesBase.length), from);
    if (id) return servicePath(id, target);
  }

  const workBase = `${ROUTES.work[from]}/`;
  if (clean.startsWith(workBase)) {
    const slug = clean.slice(workBase.length);
    if (/^[a-z0-9-]+$/.test(slug)) return projectPath(slug, target);
  }

  return ROUTES.home[target];
}
