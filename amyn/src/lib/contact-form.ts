/**
 * Règles du formulaire de projet — partagées par le navigateur et le serveur.
 *
 * Un seul fichier pour les deux côtés : le visiteur voit une erreur
 * immédiate, et le serveur revalide exactement la même chose. Une validation
 * qui n'existe que dans le navigateur ne protège de rien.
 *
 * Dix champs, pas vingt-cinq. Chacun sert soit à répondre au prospect, soit
 * à chiffrer son projet — rien n'est demandé « au cas où ».
 */

export type ContactField =
  | "firstName"
  | "lastName"
  | "company"
  | "email"
  | "phone"
  | "sector"
  | "currentSite"
  | "budget"
  | "timeline"
  | "message";

export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;

export const EMPTY_CONTACT: ContactValues = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  sector: "",
  currentSite: "",
  budget: "",
  timeline: "",
  message: "",
};

/**
 * Champ-piège. Invisible pour un humain, souvent rempli par un robot.
 * Le nom est banal exprès : un robot le reconnaît et mord à l'hameçon.
 */
export const HONEYPOT_FIELD = "website";

export const SECTORS = [
  "Restaurant / Café",
  "Coiffure / Beauté",
  "Artisan / BTP",
  "Immobilier",
  "Commerce",
  "Santé / Bien-être",
  "Services aux entreprises",
  "Autre",
] as const;

/* Des tranches, pas un montant exact : on cherche à cadrer, pas à négocier
   avant même d'avoir parlé. La dernière option évite de bloquer quelqu'un
   qui découvre les prix. */
export const BUDGETS = [
  "Moins de 1 000 €",
  "1 000 € – 1 500 €",
  "1 500 € – 2 500 €",
  "Plus de 2 500 €",
  "Je ne sais pas encore",
] as const;

export const TIMELINES = [
  "Dès que possible",
  "Dans 1 à 3 mois",
  "Dans 3 à 6 mois",
  "Pas encore décidé",
] as const;

export type FieldDefinition = {
  name: ContactField;
  label: string;
  type: "text" | "email" | "tel" | "url" | "textarea" | "select";
  autoComplete: string;
  optional?: boolean;
  options?: readonly string[];
  placeholder?: string;
};

export const FIELDS: FieldDefinition[] = [
  { name: "firstName", label: "Prénom", type: "text", autoComplete: "given-name" },
  { name: "lastName", label: "Nom", type: "text", autoComplete: "family-name" },
  { name: "company", label: "Entreprise", type: "text", autoComplete: "organization" },
  { name: "email", label: "Email professionnel", type: "email", autoComplete: "email" },
  { name: "phone", label: "Téléphone", type: "tel", autoComplete: "tel", optional: true },
  { name: "sector", label: "Secteur", type: "select", autoComplete: "off", options: SECTORS },
  {
    name: "currentSite",
    label: "Site actuel",
    type: "url",
    autoComplete: "url",
    optional: true,
    placeholder: "https://…",
  },
  { name: "budget", label: "Budget envisagé", type: "select", autoComplete: "off", options: BUDGETS },
  {
    name: "timeline",
    label: "Échéance",
    type: "select",
    autoComplete: "off",
    optional: true,
    options: TIMELINES,
  },
  { name: "message", label: "Votre projet", type: "textarea", autoComplete: "off" },
];

/* Volontairement tolérantes : elles refusent ce qui n'est manifestement pas
   valide, sans jouer à deviner à la place du serveur de messagerie. */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^[+0-9][0-9\s.\-()]{5,24}$/;

export const LIMITS = {
  name: { min: 2, max: 60 },
  company: { min: 2, max: 90 },
  email: { max: 140 },
  phone: { max: 25 },
  site: { max: 200 },
  message: { min: 10, max: 2000 },
} as const;

export function validateContact(values: Partial<ContactValues>): ContactErrors {
  const errors: ContactErrors = {};
  const get = (k: ContactField) => (values[k] ?? "").trim();

  const firstName = get("firstName");
  if (firstName.length < LIMITS.name.min) errors.firstName = "Indiquez votre prénom.";
  else if (firstName.length > LIMITS.name.max) errors.firstName = "Prénom trop long.";

  const lastName = get("lastName");
  if (lastName.length < LIMITS.name.min) errors.lastName = "Indiquez votre nom.";
  else if (lastName.length > LIMITS.name.max) errors.lastName = "Nom trop long.";

  const company = get("company");
  if (company.length < LIMITS.company.min)
    errors.company = "Indiquez le nom de votre entreprise.";
  else if (company.length > LIMITS.company.max)
    errors.company = "Nom d'entreprise trop long.";

  const email = get("email");
  if (!email) errors.email = "Indiquez votre adresse email.";
  else if (email.length > LIMITS.email.max) errors.email = "Adresse trop longue.";
  else if (!EMAIL.test(email)) errors.email = "Cette adresse ne semble pas valide.";

  /* Facultatifs : on ne les contrôle que s'ils sont remplis. */
  const phone = get("phone");
  if (phone && !PHONE.test(phone)) errors.phone = "Ce numéro ne semble pas valide.";

  const currentSite = get("currentSite");
  if (currentSite && currentSite.length > LIMITS.site.max)
    errors.currentSite = "Adresse trop longue.";

  const sector = get("sector");
  if (!sector) errors.sector = "Choisissez votre secteur.";
  else if (!SECTORS.includes(sector as (typeof SECTORS)[number]))
    errors.sector = "Secteur inconnu.";

  const budget = get("budget");
  if (!budget) errors.budget = "Donnez-nous un ordre de grandeur.";
  else if (!BUDGETS.includes(budget as (typeof BUDGETS)[number]))
    errors.budget = "Budget inconnu.";

  const timeline = get("timeline");
  if (timeline && !TIMELINES.includes(timeline as (typeof TIMELINES)[number]))
    errors.timeline = "Échéance inconnue.";

  const message = get("message");
  if (message.length < LIMITS.message.min)
    errors.message = "Décrivez votre projet en quelques mots.";
  else if (message.length > LIMITS.message.max)
    errors.message = `Message trop long (${LIMITS.message.max} caractères maximum).`;

  return errors;
}

export function hasErrors(errors: ContactErrors) {
  return Object.keys(errors).length > 0;
}
