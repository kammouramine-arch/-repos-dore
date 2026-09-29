/**
 * Langues du site. Le français est la langue principale : ses adresses
 * restent à la racine (`/`, `/services`…) ; l'anglais vit sous `/en`.
 *
 * Ce module n'importe rien : il est utilisable partout (serveur, client,
 * tests Node).
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/** Balise de langue pour Open Graph. */
export const OG_LOCALE: Record<Locale, string> = { fr: "fr_FR", en: "en_GB" };

/** Nom de chaque langue, écrit dans cette langue. */
export const LANGUAGE_NAME: Record<Locale, string> = { fr: "Français", en: "English" };

/** Langue d'une adresse : tout ce qui commence par `/en` est en anglais. */
export const localeFromPath = (pathname: string): Locale =>
  pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";

/** Choisit une valeur selon la langue — pour les petits textes isolés. */
export const pick = <T,>(locale: Locale, values: Record<Locale, T>): T => values[locale];
