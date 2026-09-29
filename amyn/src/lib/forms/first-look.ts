import {
  FORM_LOCALES,
  LIMITS,
  checkIdentity,
  cleanChoice,
  cleanChoices,
  cleanLine,
  cleanText,
  type Errors,
  type FormLocale,
} from "./shared.ts";

/**
 * Formulaire unique : « Recevoir un premier aperçu ».
 *
 * Un seul parcours pour tous les visiteurs, en trois étapes : vous, ce que
 * vous voulez améliorer, le projet. Pas de budget : le prix se discute
 * après l'analyse du besoin, jamais avant.
 *
 * Les valeurs envoyées (services, échéance) restent les libellés français :
 * la demande reçue par AMYN est la même quelle que soit la langue du
 * visiteur. Seul l'affichage est traduit.
 */

export const SERVICE_OPTIONS = [
  "Site web / refonte",
  "Suivi demandes & devis",
  "Application mobile",
  "Réservation en ligne",
  "Google Business",
  "Onboarding client",
  "Portfolio & contenu",
  "Je ne sais pas encore",
] as const;
export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export const SERVICE_LABELS_EN: Record<ServiceOption, string> = {
  "Site web / refonte": "Website / redesign",
  "Suivi demandes & devis": "Request & quote tracking",
  "Application mobile": "Mobile app",
  "Réservation en ligne": "Online booking",
  "Google Business": "Google Business Profile",
  "Onboarding client": "Client onboarding",
  "Portfolio & contenu": "Portfolio & content",
  "Je ne sais pas encore": "Not sure yet",
};

/**
 * Pré-sélection depuis une page de service (`?besoin=` ou `?service=`),
 * par l'identifiant du service ou par son adresse anglaise.
 */
export const SERVICE_BY_SLUG: Record<string, ServiceOption> = {
  "site-web": "Site web / refonte",
  "suivi-demandes-devis": "Suivi demandes & devis",
  "application-mobile": "Application mobile",
  "reservation-en-ligne": "Réservation en ligne",
  "google-business": "Google Business",
  "onboarding-client": "Onboarding client",
  "portfolio-contenu": "Portfolio & contenu",
  website: "Site web / refonte",
  "request-and-quote-tracking": "Suivi demandes & devis",
  "mobile-app": "Application mobile",
  "online-booking": "Réservation en ligne",
  "google-business-profile": "Google Business",
  "client-onboarding": "Onboarding client",
  "portfolio-and-content": "Portfolio & contenu",
};

export const TIMELINES = [
  "Dès que possible",
  "Moins d'un mois",
  "1 à 3 mois",
  "Plus tard, en réflexion",
] as const;
export type Timeline = (typeof TIMELINES)[number];

export const TIMELINE_LABELS_EN: Record<Timeline, string> = {
  "Dès que possible": "As soon as possible",
  "Moins d'un mois": "Within a month",
  "1 à 3 mois": "1 to 3 months",
  "Plus tard, en réflexion": "Later — still thinking",
};

/** Libellé affiché d'un choix, dans la langue du visiteur. */
export const optionLabel = (option: ServiceOption | Timeline, locale: FormLocale): string =>
  locale === "en"
    ? ((SERVICE_LABELS_EN as Record<string, string>)[option] ??
      (TIMELINE_LABELS_EN as Record<string, string>)[option] ??
      option)
    : option;

/** Origine de la visite, déclarée par le lien — jamais déduite. */
export const SOURCES = ["site", "outreach"] as const;
export type Source = (typeof SOURCES)[number];

export type FirstLookValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  presence: string;
  services: ServiceOption[];
  need: string;
  timeline: Timeline | "";
  description: string;
  privacy: boolean;
  source: Source;
  /** Langue du visiteur : celle des messages, et une ligne de la demande. */
  lang: FormLocale;
};

export type FirstLookField = Exclude<keyof FirstLookValues, "source" | "lang">;

export const EMPTY_FIRST_LOOK: FirstLookValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  presence: "",
  services: [],
  need: "",
  timeline: "",
  description: "",
  privacy: false,
  source: "site",
  lang: "fr",
};

/** Les trois étapes et les champs que chacune valide. */
export const STEPS: { title: string; titleEn: string; fields: FirstLookField[] }[] = [
  { title: "Parlez-nous de vous", titleEn: "About you", fields: ["name", "company", "email", "phone", "presence"] },
  { title: "Que souhaitez-vous améliorer ?", titleEn: "What would you like to improve?", fields: ["services", "need", "timeline"] },
  { title: "Parlez-nous du projet", titleEn: "Tell us about the project", fields: ["description", "privacy"] },
];

export const FIRST_LOOK_ORDER: FirstLookField[] = STEPS.flatMap((s) => s.fields);

/** Nettoie une saisie brute (navigateur ou requête) champ par champ. */
export function sanitizeFirstLook(raw: Record<string, unknown>): FirstLookValues {
  return {
    name: cleanLine(raw.name, LIMITS.name),
    company: cleanLine(raw.company, LIMITS.company),
    email: cleanLine(raw.email, LIMITS.email).toLowerCase(),
    phone: cleanLine(raw.phone, LIMITS.phone),
    presence: cleanLine(raw.presence, LIMITS.url),
    services: cleanChoices(raw.services, SERVICE_OPTIONS),
    need: cleanLine(raw.need, LIMITS.line),
    timeline: cleanChoice(raw.timeline, TIMELINES),
    description: cleanText(raw.description, LIMITS.text),
    privacy: raw.privacy === true,
    source: cleanChoice(raw.source, SOURCES) || "site",
    lang: cleanChoice(raw.lang, FORM_LOCALES) || "fr",
  };
}

const MESSAGES = {
  fr: {
    services: "Choisissez au moins un service, ou « Je ne sais pas encore ».",
    need: "Dites-nous en quelques mots ce que vous voulez améliorer.",
    timeline: "Choisissez une échéance.",
    description: "Décrivez votre activité et votre projet en quelques phrases.",
    privacy: "Merci de confirmer avoir pris connaissance de la politique de confidentialité.",
  },
  en: {
    services: "Choose at least one service, or “Not sure yet”.",
    need: "Tell us in a few words what you'd like to improve.",
    timeline: "Choose a timeframe.",
    description: "Describe your business and your project in a few sentences.",
    privacy: "Please confirm you have read the privacy policy.",
  },
} as const;

export function validateFirstLook(v: FirstLookValues): Errors<FirstLookField> {
  const errors: Record<string, string> = {};
  const m = MESSAGES[v.lang] ?? MESSAGES.fr;
  checkIdentity(v, errors, v.lang);
  if (v.services.length === 0) errors.services = m.services;
  if (v.need.length < 5) errors.need = m.need;
  if (!v.timeline) errors.timeline = m.timeline;
  if (v.description.length < 15) errors.description = m.description;
  if (!v.privacy) errors.privacy = m.privacy;
  return errors;
}

/** Erreurs limitées aux champs d'une étape. */
export function validateStep(v: FirstLookValues, step: number): Errors<FirstLookField> {
  const all = validateFirstLook(v);
  const fields = new Set(STEPS[step].fields);
  return Object.fromEntries(Object.entries(all).filter(([k]) => fields.has(k as FirstLookField)));
}
