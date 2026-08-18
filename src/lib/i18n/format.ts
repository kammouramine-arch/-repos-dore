import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from './config';

/**
 * Formatage des dates et durées.
 * Ce module ne dépend d'aucune API serveur : il est utilisable dans les
 * composants client comme dans les composants serveur.
 */

export function formatDate(
  date: Date | string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
  style: 'short' | 'medium' | 'long' = 'medium',
): string {
  if (!date) return '—';
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: style === 'short' ? 'short' : style === 'long' ? 'long' : 'medium',
  }).format(value);
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (!date) return '—';
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

/** Écart relatif lisible : « il y a 3 jours ». */
export function formatRelative(date: Date | string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (!date) return '—';
  const value = typeof date === 'string' ? new Date(date) : date;
  const diffMs = value.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(INTL_LOCALES[locale], { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return formatter.format(Math.round(diffMs / ms), unit);
  }
  return formatter.format(0, 'minute');
}

export * from './config';
