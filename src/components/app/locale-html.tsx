'use client';

import { useEffect } from 'react';

/** Aligne l'attribut `lang` du document sur la langue choisie dans l'application. */
export function LocaleHtml({ locale }: { locale: string }) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);
  return null;
}
