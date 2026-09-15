'use client';

import * as React from 'react';
import { fr, type Dictionary } from './dictionaries/fr';
import { DEFAULT_LOCALE, type Locale } from './config';

/**
 * Dictionnaire accessible aux composants client.
 *
 * Les composants serveur lisent la langue via `getTranslations()` ; les
 * composants client la reçoivent une seule fois, injectée par la coque
 * applicative. Aucun appel réseau, aucune duplication du dictionnaire.
 */
interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = React.createContext<I18nValue>({ locale: DEFAULT_LOCALE, t: fr });

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ locale, t: dictionary }), [locale, dictionary]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return React.useContext(I18nContext);
}

/** Raccourci lorsqu'on n'a besoin que des libellés. */
export function useT(): Dictionary {
  return React.useContext(I18nContext).t;
}
