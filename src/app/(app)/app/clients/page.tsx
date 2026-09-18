import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX, Users } from 'lucide-react';
import { requirePermission } from '@/lib/auth/page-session';
import { listCustomers, type CustomerSort } from '@/server/services/customerService';
import { formatCents } from '@/lib/money';
import { formatDate, format, getTranslations } from '@/lib/i18n';
import { fullName } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { Avatar } from '@/components/app/shell';
import { Pagination, SearchField, SortSelect } from '@/components/app/list-toolbar';
import { CustomerDialog } from './dialog';

export const metadata: Metadata = { title: 'Clients' };

const PAGE_SIZE = 30;

/**
 * Clients : une table sur ordinateur, des cartes sur mobile. La recherche
 * filtre sans rechargement, le tri et la page vivent dans l'URL.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tri?: string; page?: string }>;
}) {
  const auth = await requirePermission('customer:read');
  const { locale, t } = await getTranslations();
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const sort: CustomerSort = params.tri === 'name' ? 'name' : 'recent';
  const page = Math.max(1, Number(params.page) || 1);

  const { items, total } = await listCustomers(auth.organization.organizationId, {
    search,
    sort,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (target: number) => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (sort !== 'recent') next.set('tri', sort);
    if (target > 1) next.set('page', String(target));
    const query = next.toString();
    return query ? `/app/clients?${query}` : '/app/clients';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.customers.title}
        description={total > 0 || search ? format(t.customers.results, { count: total }) : t.customers.emptyBody}
        actions={<CustomerDialog />}
      />

      {total === 0 && !search ? (
        <EmptyState icon={Users} title={t.empty.customers} description={t.customers.emptyBody} action={<CustomerDialog />} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchField placeholder={t.customers.searchPlaceholder} className="w-full sm:max-w-sm" />
            <SortSelect
              options={[
                { value: 'recent', label: t.customers.sortRecent },
                { value: 'name', label: t.customers.sortName },
              ]}
              value={sort}
              label={t.quotes.sort}
            />
          </div>

          {items.length === 0 ? (
            <EmptyState icon={SearchX} title={t.customers.notFound} description={t.customers.notFoundBody} />
          ) : (
            <Card className="overflow-hidden">
              <div className="hidden md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface/70">
                      {[t.customers.title, t.customers.contact, t.customers.city, t.customers.sentQuotes, t.customers.quotedRevenue, t.customers.since].map((header, index) => (
                        <th
                          key={header}
                          scope="col"
                          className={`px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-subtle ${index >= 3 && index <= 4 ? 'text-right' : ''}`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((customer) => {
                      const name = fullName(customer.firstName, customer.lastName, customer.companyName);
                      return (
                        <tr key={customer.id} className="group transition-colors hover:bg-surface/60">
                          <td className="px-4 py-3">
                            <Link href={`/app/clients/${customer.id}`} className="flex items-center gap-3">
                              <Avatar name={name} url={null} />
                              <span className="min-w-0">
                                <span className="block truncate text-[13.5px] font-semibold text-ink group-hover:text-accent">{name}</span>
                                {customer.companyName && (customer.firstName || customer.lastName) ? (
                                  <span className="block truncate text-[12px] text-subtle">{customer.companyName}</span>
                                ) : null}
                              </span>
                            </Link>
                          </td>
                          <td className="max-w-[260px] px-4 py-3 text-[13px] text-muted">
                            <span className="block truncate">{customer.email ?? '—'}</span>
                            {customer.phone ? <span className="block truncate text-[12.5px] text-subtle tabular">{customer.phone}</span> : null}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-muted">{[customer.postalCode, customer.city].filter(Boolean).join(' ') || '—'}</td>
                          <td className="px-4 py-3 text-right text-[13.5px] font-medium text-ink tabular">{customer.sentCount}</td>
                          <td className="px-4 py-3 text-right text-[13.5px] font-semibold text-ink tabular">{formatCents(customer.revenueCents, { compact: true })}</td>
                          <td className="px-4 py-3 text-[12.5px] text-subtle tabular">{formatDate(customer.createdAt, locale)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line md:hidden">
                {items.map((customer) => {
                  const name = fullName(customer.firstName, customer.lastName, customer.companyName);
                  return (
                    <li key={customer.id}>
                      <Link href={`/app/clients/${customer.id}`} className="pressable flex items-center gap-3 px-4 py-3.5 active:bg-surface">
                        <Avatar name={name} url={null} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
                          <span className="block truncate text-[12.5px] text-muted">
                            {[customer.email, customer.phone, customer.city].filter(Boolean).join(' · ') || t.customers.noContact}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[13.5px] font-semibold text-ink tabular">{formatCents(customer.revenueCents, { compact: true })}</span>
                          <span className="block text-[11.5px] text-subtle tabular">{customer.sentCount} {t.quotes.sent.toLowerCase()}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Pagination page={page} pages={pages} previousHref={buildHref(Math.max(1, page - 1))} nextHref={buildHref(Math.min(pages, page + 1))} />
        </>
      )}
    </div>
  );
}
