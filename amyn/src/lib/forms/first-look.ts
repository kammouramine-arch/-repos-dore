import {
  LIMITS,
  checkIdentity,
  cleanChoice,
  cleanChoices,
  cleanLine,
  cleanText,
  type Errors,
} from "./shared.ts";

/**
 * Formulaire unique : « Recevoir un premier aperçu ».
 *
 * Un seul parcours pour tous les visiteurs, en trois étapes : vous, ce que
 * vous voulez améliorer, le projet. Pas de budget : le prix se discute
 * après l'analyse du besoin, jamais avant.
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

/** Pré-sélection depuis une page de service (`?besoin=` ou `?service=`). */
export const SERVICE_BY_SLUG: Record<string, ServiceOption> = {
  "site-web": "Site web / refonte",
  "suivi-demandes-devis": "Suivi demandes & devis",
  "application-mobile": "Application mobile",
  "reservation-en-ligne": "Réservation en ligne",
  "google-business": "Google Business",
  "onboarding-client": "Onboarding client",
  "portfolio-contenu": "Portfolio & contenu",
};

export const TIMELINES = [
  "Dès que possible",
  "Moins d'un mois",
  "1 à 3 mois",
  "Plus tard, en réflexion",
] as const;
export type Timeline = (typeof TIMELINES)[number];

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
};

export type FirstLookField = Exclude<keyof FirstLookValues, "source">;

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
};

/** Les trois étapes et les champs que chacune valide. */
export const STEPS: { title: string; fields: FirstLookField[] }[] = [
  { title: "Parlez-nous de vous", fields: ["name", "company", "email", "phone", "presence"] },
  { title: "Que souhaitez-vous améliorer ?", fields: ["services", "need", "timeline"] },
  { title: "Parlez-nous du projet", fields: ["description", "privacy"] },
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
  };
}

export function validateFirstLook(v: FirstLookValues): Errors<FirstLookField> {
  const errors: Record<string, string> = {};
  checkIdentity(v, errors);
  if (v.services.length === 0)
    errors.services = "Choisissez au moins un service, ou « Je ne sais pas encore ».";
  if (v.need.length < 5) errors.need = "Dites-nous en quelques mots ce que vous voulez améliorer.";
  if (!v.timeline) errors.timeline = "Choisissez une échéance.";
  if (v.description.length < 15)
    errors.description = "Décrivez votre activité et votre projet en quelques phrases.";
  if (!v.privacy)
    errors.privacy = "Merci de confirmer avoir pris connaissance de la politique de confidentialité.";
  return errors;
}

/** Erreurs limitées aux champs d'une étape. */
export function validateStep(v: FirstLookValues, step: number): Errors<FirstLookField> {
  const all = validateFirstLook(v);
  const fields = new Set(STEPS[step].fields);
  return Object.fromEntries(Object.entries(all).filter(([k]) => fields.has(k as FirstLookField)));
}
