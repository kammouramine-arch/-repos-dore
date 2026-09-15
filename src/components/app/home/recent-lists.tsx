import Link from 'next/link';
import { ArrowUpRight, Eye, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteStatusBadge } from '@/components/status';
import { Avatar } from '@/components/app/shell';
import { formatCents } from '@/lib/money';
import { format, formatRelative, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n/dictionaries/fr';
import type { HomeOverview } from '@/server/services/homeService';

/** « Vos devis » : les derniers devis touchés, comme le carrousel de l'accueil iOS. */
export function RecentQuotes({ quotes, t, locale }: { quotes: HomeOverview['recentQuotes']; t: Dictionary; locale: Locale }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.dashboard.recentQuotes}</CardTitle>
        <Link href="/app/devis" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
          {t.common.seeAll}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent className="pt-3">
        {quotes.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-subtle">{t.quotes.emptyTitle}</p>
        ) : (
          <ul className="divide-y divide-line">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/app/devis/${quote.id}`}
                  className="pressable -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3 transition-colors hover:bg-surface"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink-soft">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{quote.title}</span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {quote.customerName} · <span className="tabular">{quote.number}</span>
                      {quote.viewCount > 0 ? (
                        <span className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap text-accent-hover">
                          <Eye className="h-3 w-3" aria-hidden />
                          {format(t.dashboard.views, { count: quote.viewCount })}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <QuoteStatusBadge status={quote.status} t={t} />
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[14px] font-semibold text-ink tabular">{formatCents(quote.totalCents)}</span>
                    <span className="block text-[11.5px] text-subtle">{formatRelative(quote.sentAt ?? quote.createdAt, locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentCustomers({ customers, t, locale }: { customers: HomeOverview['recentCustomers']; t: Dictionary; locale: Locale }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.dashboard.recentCustomers}</CardTitle>
        <Link href="/app/clients" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
          {t.common.seeAll}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent className="pt-3">
        {customers.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-[13.5px] text-subtle">
            <Users className="h-4 w-4" aria-hidden />
            {t.dashboard.noCustomersYet}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/app/clients/${customer.id}`}
                  className="pressable -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface"
                >
                  <Avatar name={customer.name} url={null} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{customer.name}</span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {[customer.city, customer.email].filter(Boolean).join(' · ') || t.customers.noContact}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-subtle">{formatRelative(customer.createdAt, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
