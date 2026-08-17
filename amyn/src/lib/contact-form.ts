/**
 * Règles du formulaire de contact — partagées par le navigateur et le serveur.
 *
 * Un seul fichier pour les deux côtés : le visiteur voit une erreur immédiate,
 * et le serveur revalide exactement la même chose. Une validation qui n'existe
 * que dans le navigateur ne protège de rien : elle se contourne en trois clics.
 *
 * Écrit à la main plutôt qu'avec une librairie de validation : six champs ne
 * justifient pas une dépendance de plus.
 */

export type ContactField =
  | "firstName"
  | "lastName"
  | "company"
  | "email"
  | "phone"
  | "message";

export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;

export const EMPTY_CONTACT: ContactValues = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  message: "",
};

/**
 * Champ-piège. Invisible pour un humain, souvent rempli par un robot.
 * Le nom est banal exprès : un robot le reconnaît et mord à l'hameçon.
 */
export const HONEYPOT_FIELD = "website";

export const FIELDS: {
  name: ContactField;
  label: string;
  type: "text" | "email" | "tel" | "textarea";
  autoComplete: string;
  optional?: boolean;
}[] = [
  { name: "firstName", label: "Prénom", type: "text", autoComplete: "given-name" },
  { name: "lastName", label: "Nom", type: "text", autoComplete: "family-name" },
  { name: "company", label: "Entreprise", type: "text", autoComplete: "organization" },
  { name: "email", label: "Email professionnel", type: "email", autoComplete: "email" },
  { name: "phone", label: "Téléphone", type: "tel", autoComplete: "tel", optional: true },
  { name: "message", label: "Votre projet", type: "textarea", autoComplete: "off" },
];

/* Volontairement tolérante : elle refuse ce qui n'est manifestement pas une
   adresse, sans jouer à deviner à la place du serveur de messagerie. */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^[+0-9][0-9\s.\-()]{5,24}$/;

export const LIMITS = {
  name: { min: 2, max: 60 },
  company: { min: 2, max: 90 },
  email: { max: 140 },
  phone: { max: 25 },
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

  /* Le téléphone est facultatif : on ne le contrôle que s'il est rempli. */
  const phone = get("phone");
  if (phone && !PHONE.test(phone))
    errors.phone = "Ce numéro ne semble pas valide.";

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
