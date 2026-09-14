import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye, FileText, Plus, SearchX } from 'lucide-react';
import { requirePermission } from '@/lib/auth/page-session';
import { can } from '@/lib/auth/permissions';
import { appUrl } from '@/lib/env';
import { formatCents } from '@/lib/money';
import { formatDate, formatRelative, format, getTranslations } from '@/lib/i18n';
import {
  listQuotesForWeb,
  QUOTE_LIST_FILTERS,
  QUOTE_LIST_SORTS,
  type QuoteListFilter,
  type QuoteListSort,
} from '@/server/services/quoteListService';
import { QUOTE_EVENT_LABELS } from '@devisia/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { QuoteStatusBadge } from '@/components/status';
import { FilterChips, Pagination, SearchField, SortSelect } from '@/components/app/list-toolbar';
import { QuoteRowMenu } from './row-menu';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Devis' };

const DELETABLE = ['BROUILLON', 'ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE', 'EXPIRE', 'REFUSE'];

/**
 * Devis : la vue de travail principale sur ordinateur.
 *
 * Recherche, filtres de statut, tri et pagination vivent dans l'URL : un
 * lien partagé rouvre exactement la même vue. Le tableau est dense mais
 * lisible ; sur mobile, chaque devis devient une carte.
 */
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; tri?: string; page?: string }>;
}) {
  const auth = await requirePermission('quote:read');
  const { locale, t } = await getTranslations();
  const params = await searchParams;
  const filter = (QUOTE_LIST_FILTERS.includes(params.statut as QuoteListFilter) ? params.statut : 'TOUS') as QuoteListFilter;
  const sort = (QUOTE_LIST_SORTS.includes(params.tri as QuoteListSort) ? params.tri : 'recent') as QuoteListSort;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() || undefined;

  const result = await listQuotesForWeb(auth.organization.organizationId, { search, filter, sort, page });
  const canDelete = can(auth.organization.role, 'quote:delete');
  const filtering = Boolean(search) || filter !== 'TOUS';

  const filterOptions = [
    { value: 'TOUS', label: t.quotes.all, count: result.counts.TOUS },
    { value: 'BROUILLON', label: t.quotes.drafts, count: result.counts.BROUILLON },
    { value: 'ENVOYE', label: t.quotes.sent, count: result.counts.ENVOYE },
    { value: 'CONSULTE', label: t.quotes.viewed, count: result.counts.CONSULTE },
    { value: 'EXPIRE', label: t.quotes.expired, count: result.counts.EXPIRE },
    { value: 'ANNULE', label: t.quotes.canceled, count: result.counts.ANNULE },
  ];
  const sortOptions = [
    { value: 'recent', label: t.quotes.sortRecent },
    { value: 'amount', label: t.quotes.sortAmount },
    { value: 'customer', label: t.quotes.sortCustomer },
    { value: 'validity', label: t.quotes.sortValidity },
  ];
  const buildHref = (target: number) => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (filter !== 'TOUS') next.set('statut', filter);
    if (sort !== 'recent') next.set('tri', sort);
    if (target > 1) next.set('page', String(target));
    const query = next.toString();
    return query ? `/app/devis?${query}` : '/app/devis';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.quotes.title}
        description={result.counts.TOUS > 0 ? format(t.quotes.results, { count: result.counts.TOUS }) : t.quotes.subtitle}
        actions={
          <Button asChild>
            <Link href="/app/devis/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              {t.quotes.new}
            </Link>
          </Button>
        }
      />

      {result.counts.TOUS === 0 && !filtering ? (
        <EmptyState
          icon={FileText}
          title={t.quotes.emptyTitle}
          description={t.quotes.emptyBody}
          action={
            <Button asChild size="lg">
              <Link href="/app/devis/nouveau">{t.quotes.emptyCta}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchField placeholder={t.quotes.searchPlaceholder} className="w-full lg:max-w-sm" />
            <div className="flex items-center gap-3">
              <FilterChips param="statut" options={filterOptions} value={filter} />
              <span className="hidden lg:block">
                <SortSelect options={sortOptions} value={sort} label={t.quotes.sort} />
              </span>
            </div>
          </div>

          {result.items.length === 0 ? (
            <EmptyState icon={SearchX} title={t.quotes.noResults} description={t.quotes.noResultsBody} />
          ) : (
            <Card className="overflow-hidden">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface/70">
                      {[t.quotes.number, t.quotes.customer, t.quotes.title, t.quotes.status, t.quotes.total, t.quotes.lastActivity, t.quotes.validity, ''].map((header, index) => (
                        <th
                          key={`${header}-${index}`}
                          scope="col"
                          className={cn('whitespace-nowrap px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-subtle', index === 4 && 'text-right', (index === 5 || index === 6) && 'hidden lg:table-cell')}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {result.items.map((quote) => {
                      const publicUrl = appUrl(`/devis/${quote.publicToken}`);
                      return (
                        <tr key={quote.id} className="group transition-colors hover:bg-surface/60">
                          <td className="whitespace-nowrap px-4 py-3">
                            <Link href={`/app/devis/${quote.id}`} className="text-[13.5px] font-semibold text-ink tabular hover:text-accent">
                              {quote.number}
                            </Link>
                          </td>
                          <td className="max-w-[220px] px-4 py-3">
                            <Link href={`/app/clients/${quote.customerId}`} className="block truncate text-[13.5px] text-ink-soft hover:text-accent">
                              {quote.customerName}
                            </Link>
                          </td>
                          <td className="max-w-[300px] px-4 py-3">
                            <Link href={`/app/devis/${quote.id}`} className="block truncate text-[13.5px] text-muted group-hover:text-ink">
                              {quote.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <QuoteStatusBadge status={quote.status} t={t} />
                              {quote.viewCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[12px] text-accent-hover tabular" title={t.quotes.views}>
                                  <Eye className="h-3.5 w-3.5" aria-hidden />
                                  {quote.viewCount}
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-[13.5px] font-semibold text-ink tabular">{formatCents(quote.totalCents)}</td>
                          <td className="hidden min-w-[150px] px-4 py-3 text-[12.5px] text-muted lg:table-cell">
                            {quote.lastEvent ? (
                              <>
                                <span className="block text-ink-soft">{QUOTE_EVENT_LABELS[quote.lastEvent.type as keyof typeof QUOTE_EVENT_LABELS] ?? quote.lastEvent.type}</span>
                                <span className="block text-[11.5px] text-subtle">{formatRelative(quote.lastEvent.at, locale)}</span>
                              </>
                            ) : (
                              <span className="text-subtle">{formatDate(quote.createdAt, locale)}</span>
                            )}
                          </td>
                          <td className={cn('hidden whitespace-nowrap px-4 py-3 text-[12.5px] tabular lg:table-cell', quote.expired ? 'font-medium text-warning' : 'text-subtle')}>
                            {quote.validUntil ? formatDate(quote.validUntil, locale) : '—'}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <QuoteRowMenu quoteId={quote.id} number={quote.number} publicUrl={publicUrl} canDelete={canDelete && DELETABLE.includes(quote.status)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line md:hidden">
                {result.items.map((quote) => (
                  <li key={quote.id}>
                    <Link href={`/app/devis/${quote.id}`} className="pressable block px-4 py-3.5 active:bg-surface">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-ink">{quote.customerName}</p>
                          <p className="mt-0.5 truncate text-[13px] text-muted">{quote.title}</p>
                          <p className="mt-1.5 flex items-center gap-2 text-[12px] text-subtle tabular">
                            {quote.number}
                            <QuoteStatusBadge status={quote.status} t={t} />
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block text-[14px] font-semibold text-ink tabular">{formatCents(quote.totalCents)}</span>
                          <span className="block text-[11.5px] text-subtle">{formatRelative(quote.sentAt ?? quote.createdAt, locale)}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Pagination page={result.page} pages={result.pages} previousHref={buildHref(Math.max(1, result.page - 1))} nextHref={buildHref(Math.min(result.pages, result.page + 1))} />
        </>
      )}
    </div>
  );
}
