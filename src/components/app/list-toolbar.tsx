'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/field';
import { Select } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/context';
import { format } from '@/lib/i18n/format';

/**
 * Barre d'outils de liste : recherche instantanée (l'URL porte l'état, le
 * serveur filtre), puces de filtre et tri. Aucun rechargement complet : la
 * navigation Next remplace l'URL et rafraîchit la page en place.
 */
function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      // Toute modification de filtre repart de la première page.
      if (!('page' in patch)) next.delete('page');
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { params, set };
}

export function SearchField({ placeholder, param = 'q', className }: { placeholder: string; param?: string; className?: string }) {
  const { params, set } = useUrlState();
  const initial = params.get(param) ?? '';
  const [value, setValue] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const last = React.useRef(initial);

  React.useEffect(() => {
    if (value === last.current) return;
    const timer = setTimeout(() => {
      last.current = value;
      startTransition(() => set({ [param]: value.trim() || null }));
    }, 280);
    return () => clearTimeout(timer);
  }, [value, param, set]);

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn('pl-9 pr-9', pending && 'text-muted')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[6px] p-1 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Effacer"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips({
  param,
  options,
  value,
}: {
  param: string;
  options: { value: string; label: string; count?: number }[];
  value: string;
}) {
  const { set } = useUrlState();
  return (
    <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Filtres">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => set({ [param]: active || option.value === options[0]?.value ? null : option.value })}
            aria-pressed={active}
            className={cn(
              'pressable inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
              active ? 'bg-ink text-white' : 'border border-line bg-canvas text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {option.label}
            {option.count != null && option.count > 0 ? (
              <span className={cn('tabular', active ? 'text-white/70' : 'text-subtle')}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export function SortSelect({ param = 'tri', options, value, label }: { param?: string; options: { value: string; label: string }[]; value: string; label: string }) {
  const { set } = useUrlState();
  return (
    <Select value={value} onChange={(event) => set({ [param]: event.target.value })} aria-label={label} className="h-9 w-[170px] text-[13px]">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function Pagination({ page, pages, previousHref, nextHref }: { page: number; pages: number; previousHref: string; nextHref: string }) {
  const t = useT();
  if (pages <= 1) return null;
  const link = 'inline-flex h-8 items-center gap-1 rounded-[8px] border border-line bg-canvas px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface aria-disabled:pointer-events-none aria-disabled:opacity-40';
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <span className="text-[12.5px] text-subtle tabular">{format(t.quotes.pageOf, { page, pages })}</span>
      <div className="flex items-center gap-1.5">
        <Link href={previousHref} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={link}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {t.quotes.previous}
        </Link>
        <Link href={nextHref} aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} className={link}>
          {t.quotes.nextPage}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
