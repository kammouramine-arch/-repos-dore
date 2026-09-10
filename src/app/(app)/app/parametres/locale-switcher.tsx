'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/field';
import { LOCALE_LABELS, LOCALES, type Locale } from '@/lib/i18n/config';
import { setLocale } from './actions';

/** La langue courante est fournie par le serveur : aucun état à synchroniser. */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Select
      defaultValue={current}
      disabled={pending}
      aria-label="Langue de l’interface"
      className="w-[168px]"
      onChange={(event) => {
        const next = event.target.value;
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
    >
      {LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </Select>
  );
}
