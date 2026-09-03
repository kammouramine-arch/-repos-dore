'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Hammer, Search, User, MessageSquareText } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { useT } from '@/lib/i18n/context';

interface SearchResult {
  type: 'customer' | 'lead' | 'quote' | 'job';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const ICONS = {
  quote: FileText,
  customer: User,
  lead: MessageSquareText,
  job: Hammer,
} as const;

const LABEL_KEYS = {
  quote: 'quotes',
  customer: 'customers',
  lead: 'leads',
  job: 'priceBook',
} as const;

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const t = useT();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  // La réinitialisation se fait à la fermeture, sans effet de bord au rendu.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery('');
        setResults([]);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  React.useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/recherche?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const payload = (await response.json()) as { data: SearchResult[] };
          setResults(payload.data);
        }
      } catch {
        // Requête annulée ou réseau indisponible : la liste reste inchangée.
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Les résultats affichés sont dérivés de la requête : aucun état à nettoyer.
  const visible = query.trim().length >= 2 ? results : [];

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[12%] translate-y-0 p-0" size="md">
        <DialogTitle className="sr-only">{t.common.search}</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.common.searchPlaceholder}
            className="h-12 border-0 px-0 shadow-none focus:ring-0"
            aria-label={t.nav.searchAria}
          />
        </div>

        <div className="max-h-[54vh] overflow-y-auto p-2">
          {loading && visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13.5px] text-subtle">{t.nav.searching}</p>
          ) : null}

          {!loading && query.trim().length >= 2 && visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13.5px] text-subtle">
              {t.common.noResults} — « {query} »
            </p>
          ) : null}

          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-[13.5px] text-subtle">{t.nav.searchHint}</p>
          ) : null}

          <ul>
            {visible.map((result) => {
              const Icon = ICONS[result.type];
              return (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => go(result.href)}
                    className="flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">
                        {result.title}
                      </span>
                      {result.subtitle ? (
                        <span className="block truncate text-[12.5px] text-subtle">
                          {result.subtitle}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-subtle">
                      {t.nav[LABEL_KEYS[result.type]]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
