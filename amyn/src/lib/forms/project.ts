import {
  LIMITS,
  checkIdentity,
  cleanChoice,
  cleanChoices,
  cleanLine,
  cleanText,
  isWebAddress,
  type Errors,
} from "./shared.ts";

/**
 * Formulaire « Parler de votre projet ».
 *
 * Pour les visiteurs prêts à discuter d'un projet réel : on demande de quoi
 * préparer un premier échange utile — services, situation, objectif,
 * budget, échéance. Chaque question sert à répondre, rien n'est demandé
 * « au cas où ».
 */

/* Les sept services, par leur nom court (repris des pages de service). */
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

export const SERVICE_BY_SLUG: Record<string, ServiceOption> = {
  "site-web": "Site web / refonte",
  "suivi-demandes-devis": "Suivi demandes & devis",
  "application-mobile": "Application mobile",
  "reservation-en-ligne": "Réservation en ligne",
  "google-business": "Google Business",
  "onboarding-client": "Onboarding client",
  "portfolio-contenu": "Portfolio & contenu",
};

export const SITUATIONS = [
  "Nous n'avons pas encore de site ni d'outil",
  "Nous avons un site à refaire",
  "Nous avons un site, il faut aller plus loin",
  "Nos outils actuels ne suffisent plus",
  "Autre situation",
] as const;

export const BUDGETS = [
  "Moins de 1 000 €",
  "1 000–2 500 €",
  "2 500–5 000 €",
  "5 000–10 000 €",
  "10 000 € et plus",
  "Je ne sais pas encore",
] as const;

export const TIMELINES = [
  "Dès que possible",
  "Moins d'un mois",
  "1 à 3 mois",
  "Plus tard / en réflexion",
] as const;

export type ProjectValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  services: ServiceOption[];
  situation: (typeof SITUATIONS)[number] | "";
  objective: string;
  budget: (typeof BUDGETS)[number] | "";
  timeline: (typeof TIMELINES)[number] | "";
  description: string;
  privacy: boolean;
};

export type ProjectField = keyof ProjectValues;

export const EMPTY_PROJECT: ProjectValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  services: [],
  situation: "",
  objective: "",
  budget: "",
  timeline: "",
  description: "",
  privacy: false,
};

export function sanitizeProject(raw: Record<string, unknown>): ProjectValues {
  return {
    name: cleanLine(raw.name, LIMITS.name),
    company: cleanLine(raw.company, LIMITS.company),
    email: cleanLine(raw.email, LIMITS.email).toLowerCase(),
    phone: cleanLine(raw.phone, LIMITS.phone),
    website: cleanLine(raw.website, LIMITS.url),
    services: cleanChoices(raw.services, SERVICE_OPTIONS),
    situation: cleanChoice(raw.situation, SITUATIONS),
    objective: cleanLine(raw.objective, LIMITS.line),
    budget: cleanChoice(raw.budget, BUDGETS),
    timeline: cleanChoice(raw.timeline, TIMELINES),
    description: cleanText(raw.description, LIMITS.text),
    privacy: raw.privacy === true,
  };
}

export function validateProject(v: ProjectValues): Errors<ProjectField> {
  const errors: Record<string, string> = {};
  checkIdentity(v, errors);
  if (v.website && !isWebAddress(v.website))
    errors.website = "Indiquez une adresse du type monsite.fr.";
  if (v.services.length === 0)
    errors.services = "Choisissez au moins un service, ou « Je ne sais pas encore ».";
  if (!v.situation) errors.situation = "Choisissez la situation la plus proche de la vôtre.";
  if (v.objective.length < 5) errors.objective = "Indiquez votre objectif principal en quelques mots.";
  if (!v.budget) errors.budget = "Choisissez un ordre de grandeur, ou « Je ne sais pas encore ».";
  if (!v.timeline) errors.timeline = "Choisissez une échéance.";
  if (v.description.length < 20)
    errors.description = "Décrivez votre projet en quelques phrases (20 caractères au moins).";
  if (!v.privacy)
    errors.privacy = "Merci de confirmer avoir pris connaissance de la politique de confidentialité.";
  return errors;
}

export const PROJECT_ORDER: ProjectField[] = [
  "name",
  "company",
  "email",
  "phone",
  "website",
  "services",
  "situation",
  "objective",
  "budget",
  "timeline",
  "description",
  "privacy",
];
