/**
 * Demande ProofSprint — un formulaire court, sans pièce jointe.
 *
 * On demande l'entreprise, une adresse professionnelle, l'échéance de
 * l'acheteur et quelques lignes de contexte. Aucun document source n'est
 * demandé à ce stade : leur transmission s'organise après accord sur le
 * périmètre et sur les modalités de partage.
 *
 * Mêmes règles dans le navigateur et sur le serveur (module autonome,
 * testé directement par Node).
 */
import {
  EMAIL,
  FORM_LOCALES,
  LIMITS,
  cleanChoice,
  cleanLine,
  cleanText,
  type Errors,
  type FormLocale,
} from "./shared.ts";

export type ProofSprintValues = {
  company: string;
  email: string;
  /** Facultatif : à qui répondre. */
  name: string;
  /** Échéance de l'acheteur, en toutes lettres (« fin novembre », « 14/11 »…). */
  deadline: string;
  description: string;
  privacy: boolean;
  lang: FormLocale;
};

export type ProofSprintField = Exclude<keyof ProofSprintValues, "lang">;

export const PROOFSPRINT_ORDER: ProofSprintField[] = ["company", "email", "name", "deadline", "description", "privacy"];

export const EMPTY_PROOFSPRINT: ProofSprintValues = {
  company: "",
  email: "",
  name: "",
  deadline: "",
  description: "",
  privacy: false,
  lang: "fr",
};

export const PROOFSPRINT_LIMITS = { deadline: 120, description: 1500 } as const;

export function sanitizeProofSprint(raw: Record<string, unknown>): ProofSprintValues {
  return {
    company: cleanLine(raw.company, LIMITS.company),
    email: cleanLine(raw.email, LIMITS.email).toLowerCase(),
    name: cleanLine(raw.name, LIMITS.name),
    deadline: cleanLine(raw.deadline, PROOFSPRINT_LIMITS.deadline),
    description: cleanText(raw.description, PROOFSPRINT_LIMITS.description),
    privacy: raw.privacy === true,
    lang: cleanChoice(raw.lang, FORM_LOCALES) || "fr",
  };
}

const MESSAGES = {
  fr: {
    company: "Indiquez le nom de votre entreprise.",
    emailMissing: "Indiquez votre adresse e-mail professionnelle.",
    emailInvalid: "Cette adresse e-mail ne semble pas valide.",
    deadline: "Indiquez l'échéance de votre acheteur, même approximative.",
    description: "Décrivez l'opportunité en quelques phrases.",
    privacy: "Merci de confirmer avoir pris connaissance de la politique de confidentialité.",
  },
  en: {
    company: "Please enter your company name.",
    emailMissing: "Please enter your work email address.",
    emailInvalid: "This email address doesn't look valid.",
    deadline: "Please give your buyer's deadline, even an approximate one.",
    description: "Please describe the opportunity in a few sentences.",
    privacy: "Please confirm you have read the privacy policy.",
  },
} as const;

export function validateProofSprint(v: ProofSprintValues): Errors<ProofSprintField> {
  const m = MESSAGES[v.lang] ?? MESSAGES.fr;
  const errors: Record<string, string> = {};
  if (v.company.length < 2) errors.company = m.company;
  if (!v.email) errors.email = m.emailMissing;
  else if (!EMAIL.test(v.email)) errors.email = m.emailInvalid;
  if (v.deadline.length < 2) errors.deadline = m.deadline;
  if (v.description.length < 15) errors.description = m.description;
  if (!v.privacy) errors.privacy = m.privacy;
  return errors;
}
