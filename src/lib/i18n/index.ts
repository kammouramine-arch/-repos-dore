import { cookies } from 'next/headers';
import { fr, type Dictionary } from './dictionaries/fr';
import { en } from './dictionaries/en';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? fr;
}

/** Locale active côté serveur (cookie utilisateur, français par défaut). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getTranslations(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}

export * from './format';
export type { Dictionary };
