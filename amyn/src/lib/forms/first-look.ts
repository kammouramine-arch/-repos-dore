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
 * Formulaire « Premier aperçu ».
 *
 * Le parcours le plus léger du site : on demande de quoi regarder
 * l'entreprise, rien de plus. Pas de budget, pas de délai : ce n'est pas
 * encore un projet.
 */

export const AREAS = [
  "Site web",
  "Présence sur Google",
  "Réservation",
  "Expérience sur mobile",
  "Gestion des demandes et devis",
  "Accueil des nouveaux clients",
  "Portfolio et contenus",
  "Autre fonctionnement interne",
] as const;
export type Area = (typeof AREAS)[number];

/** Origine de la visite, déclarée par le lien — jamais déduite. */
export const SOURCES = ["site", "outreach"] as const;
export type Source = (typeof SOURCES)[number];

/** Pré-sélection depuis une page de service (`?besoin=<slug>`). */
export const AREA_BY_SERVICE: Record<string, Area> = {
  "site-web": "Site web",
  "suivi-demandes-devis": "Gestion des demandes et devis",
  "application-mobile": "Expérience sur mobile",
  "reservation-en-ligne": "Réservation",
  "google-business": "Présence sur Google",
  "onboarding-client": "Accueil des nouveaux clients",
  "portfolio-contenu": "Portfolio et contenus",
};

export type FirstLookValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  presence: string;
  areas: Area[];
  notes: string;
  privacy: boolean;
  source: Source;
};

export type FirstLookField = Exclude<keyof FirstLookValues, "source">;

export const EMPTY_FIRST_LOOK: FirstLookValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  presence: "",
  areas: [],
  notes: "",
  privacy: false,
  source: "site",
};

/** Nettoie une saisie brute (navigateur ou requête) champ par champ. */
export function sanitizeFirstLook(raw: Record<string, unknown>): FirstLookValues {
  return {
    name: cleanLine(raw.name, LIMITS.name),
    company: cleanLine(raw.company, LIMITS.company),
    email: cleanLine(raw.email, LIMITS.email).toLowerCase(),
    phone: cleanLine(raw.phone, LIMITS.phone),
    website: cleanLine(raw.website, LIMITS.url),
    presence: cleanLine(raw.presence, LIMITS.url),
    areas: cleanChoices(raw.areas, AREAS),
    notes: cleanText(raw.notes, LIMITS.text),
    privacy: raw.privacy === true,
    source: cleanChoice(raw.source, SOURCES) || "site",
  };
}

export function validateFirstLook(v: FirstLookValues): Errors<FirstLookField> {
  const errors: Record<string, string> = {};
  checkIdentity(v, errors);
  if (v.website && !isWebAddress(v.website))
    errors.website = "Indiquez une adresse du type monsite.fr.";
  if (v.areas.length === 0)
    errors.areas = "Choisissez au moins un point à regarder.";
  if (!v.privacy)
    errors.privacy = "Merci de confirmer avoir pris connaissance de la politique de confidentialité.";
  return errors;
}

/** Ordre des champs, pour placer le focus sur la première erreur. */
export const FIRST_LOOK_ORDER: FirstLookField[] = [
  "name",
  "company",
  "email",
  "phone",
  "website",
  "presence",
  "areas",
  "notes",
  "privacy",
];
