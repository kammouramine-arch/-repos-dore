import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { listCustomers } from '@/server/services/customerService';
import { formatCents } from '@/lib/money';
import { formatDate, format, getTranslations } from '@/lib/i18n';
import { fullName } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { Input } from '@/components/ui/field';
import { CustomerDialog } from './dialog';

export const metadata: Metadata = { title: 'Clients' };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const auth = await requirePermission('customer:read');
  const { locale, t } = await getTranslations();
  const { q } = await searchParams;
  const { items, total } = await listCustomers(auth.organization.organizationId, { search: q });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.customers.title}
        description={format(t.customers.count, { count: total })}
        actions={<CustomerDialog />}
      />

      <form method="get" className="max-w-sm">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t.customers.searchPlaceholder}
          aria-label={t.customers.searchPlaceholder}
        />
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? t.customers.notFound : t.empty.customers}
          description={q ? t.customers.notFoundBody : t.customers.emptyBody}
          action={q ? null : <CustomerDialog />}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/app/clients/${customer.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-surface/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-ink">
                      {fullName(customer.firstName, customer.lastName, customer.companyName)}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {[customer.email, customer.phone, customer.city].filter(Boolean).join(' · ') ||
                        t.customers.noContact}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-[12px] text-subtle">{t.nav.quotes}</p>
                      <p className="text-[13.5px] font-medium text-ink tabular">
                        {customer.acceptedCount}/{customer.quoteCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-subtle">{t.customers.revenue}</p>
                      <p className="text-[13.5px] font-medium text-ink tabular">
                        {formatCents(customer.revenueCents, { compact: true })}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[12px] text-subtle">{t.customers.since}</p>
                      <p className="text-[13.5px] text-muted">{formatDate(customer.createdAt, locale)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
