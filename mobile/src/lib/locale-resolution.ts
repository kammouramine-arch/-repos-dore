/**
 * Résolution de la langue de l'application, sans dépendance native.
 *
 * Priorité, dans cet ordre et sans exception :
 * 1. le choix explicite de l'utilisateur (dans l'application, ou sur le compte) ;
 * 2. la langue de l'iPhone (première langue préférée prise en charge) ;
 * 3. le français.
 *
 * Une valeur de compte simplement déduite (langue de l'appareil à
 * l'inscription, valeur par défaut) n'est jamais un choix : elle ne peut pas
 * imposer l'anglais à un iPhone réglé en français.
 */
export type MobileLocale = 'fr' | 'en';

export type LocaleSource = 'choice' | 'account' | 'device' | 'fallback';

/** Choix explicite fait dans l'application, horodaté pour départager deux appareils. */
export interface LocaleChoice {
  locale: MobileLocale;
  /** Date ISO du choix. */
  at: string;
}

export interface AccountLocale {
  locale?: 'fr' | 'en' | null;
  /** Date ISO du choix explicite sur le compte ; null si la valeur est déduite. */
  localeChosenAt?: string | null;
}

export const FALLBACK_LOCALE: MobileLocale = 'fr';

/** Première langue prise en charge parmi les langues préférées de l'appareil. */
export function localeFromLanguageTags(tags: readonly (string | null | undefined)[]): MobileLocale | null {
  for (const tag of tags) {
    const language = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0];
    if (language === 'fr') return 'fr';
    if (language === 'en') return 'en';
  }
  return null;
}

function toTime(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

export function resolveMobileLocale(input: {
  /** Choix explicite mémorisé sur cet appareil, s'il existe. */
  choice: LocaleChoice | null | undefined;
  /** Utilisateur de la session courante, s'il y en a une. */
  account?: AccountLocale | null;
  /** Étiquettes de langue de l'appareil, par ordre de préférence. */
  deviceLanguages: readonly (string | null | undefined)[];
}): { locale: MobileLocale; source: LocaleSource } {
  const accountChoice = input.account?.localeChosenAt && (input.account.locale === 'fr' || input.account.locale === 'en')
    ? { locale: input.account.locale, at: input.account.localeChosenAt }
    : null;
  const localChoice = input.choice && (input.choice.locale === 'fr' || input.choice.locale === 'en') ? input.choice : null;

  // Deux choix explicites (deux appareils, ou le web) : le plus récent gagne.
  if (localChoice && accountChoice) {
    return toTime(accountChoice.at) > toTime(localChoice.at)
      ? { locale: accountChoice.locale, source: 'account' }
      : { locale: localChoice.locale, source: 'choice' };
  }
  if (localChoice) return { locale: localChoice.locale, source: 'choice' };
  if (accountChoice) return { locale: accountChoice.locale, source: 'account' };

  const device = localeFromLanguageTags(input.deviceLanguages);
  if (device) return { locale: device, source: 'device' };
  return { locale: FALLBACK_LOCALE, source: 'fallback' };
}

/**
 * Vrai lorsque le compte porte une langue seulement déduite qui diffère de la
 * langue effectivement affichée : le client doit l'aligner (source `inferred`)
 * pour que les emails et documents suivent la langue de l'artisan.
 */
export function accountLocaleNeedsSync(account: AccountLocale | null | undefined, effective: MobileLocale): boolean {
  if (!account || account.localeChosenAt) return false;
  return (account.locale === 'en' ? 'en' : 'fr') !== effective;
}
