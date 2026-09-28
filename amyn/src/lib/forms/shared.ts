/**
 * Règles communes aux formulaires — exécutées à l'identique dans le
 * navigateur (erreurs immédiates) et sur le serveur (seule validation qui
 * protège réellement).
 *
 * Ce module n'importe rien : il est testé directement par Node.
 */

export type Errors<K extends string> = Partial<Record<K, string>>;

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

/* ---------------------------------------------------------------------------
   Anti-robots
   --------------------------------------------------------------------------- */

/**
 * Champ-piège : invisible et hors du parcours clavier. Un humain le laisse
 * vide ; beaucoup de robots le remplissent.
 */
export const HONEYPOT_FIELD = "company_fax";

/**
 * Temps de remplissage minimal. Un formulaire rempli en moins de deux
 * secondes et demie n'a pas été rempli par une personne.
 */
export const MIN_FILL_MS = 2500;

/* ---------------------------------------------------------------------------
   Nettoyage
   --------------------------------------------------------------------------- */

/* Caractères de contrôle, hors tabulation et retours à la ligne. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

/** Une ligne : sans saut de ligne, espaces normalisés, longueur bornée. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(CONTROL, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

/** Un texte : sauts de ligne conservés (trois au plus d'affilée). */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, "")
    .replace(/\t/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, max);
}

/** Choix multiples : uniquement des valeurs connues, sans doublon. */
export function cleanChoices<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<T>();
  for (const item of value) {
    if (typeof item === "string" && (allowed as readonly string[]).includes(item)) {
      set.add(item as T);
    }
  }
  return Array.from(set);
}

/** Choix unique : la valeur si elle est connue, sinon chaîne vide. */
export function cleanChoice<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : "";
}

/* ---------------------------------------------------------------------------
   Formats
   --------------------------------------------------------------------------- */

/* Volontairement tolérantes : elles refusent ce qui n'est manifestement pas
   valide, sans prétendre vérifier l'existence d'une boîte ou d'un numéro. */
export const EMAIL = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/;
export const PHONE = /^\+?[0-9][0-9\s.\-()]{7,20}$/;

/**
 * Adresse web saisie par un humain : « monsite.fr », « www.monsite.fr » ou
 * « https://monsite.fr/page ». Tout autre protocole est refusé.
 */
export function isWebAddress(value: string): boolean {
  if (!value) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return false;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return /^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const LIMITS = {
  name: 80,
  company: 100,
  email: 160,
  phone: 25,
  url: 300,
  line: 200,
  text: 3000,
} as const;

/** Règles communes aux champs d'identité. */
export function checkIdentity(
  v: { name: string; company: string; email: string; phone: string },
  errors: Record<string, string>,
) {
  if (v.name.length < 2) errors.name = "Indiquez votre nom.";
  if (v.company.length < 2) errors.company = "Indiquez le nom de votre entreprise.";
  if (!v.email) errors.email = "Indiquez votre adresse e-mail professionnelle.";
  else if (!EMAIL.test(v.email)) errors.email = "Cette adresse e-mail ne semble pas valide.";
  if (v.phone && !PHONE.test(v.phone)) errors.phone = "Ce numéro ne semble pas valide.";
}
