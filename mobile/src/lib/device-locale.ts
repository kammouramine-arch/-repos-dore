import { getLocales } from 'expo-localization';

/**
 * Langues préférées de l'appareil, par ordre de préférence, telles que les
 * expose iOS (Réglages → Général → Langue et région).
 *
 * `Intl` de Hermes n'est pas une source fiable : il répondait « en-US » sur un
 * iPhone réglé en français, ce qui lançait l'application en anglais.
 */
export function deviceLanguageTags(): string[] {
  try {
    const tags = getLocales()
      .map((entry) => entry.languageTag || entry.languageCode || '')
      .filter((tag) => tag.length > 0);
    if (tags.length > 0) return tags;
  } catch {
    // Module natif absent (tests, web de développement) : on lit Intl ci-dessous.
  }
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    return tag ? [tag] : [];
  } catch {
    return [];
  }
}
