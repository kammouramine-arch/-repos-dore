export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE = 'devisia_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

/** Locale de formatage Intl (dates, nombres, monnaie). */
export const INTL_LOCALES: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};
