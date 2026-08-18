import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { listCustomers } from '@/server/services/customerService';
import { formatCents } from '@/lib/money';
import { formatDate } from '@/lib/i18n';
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
  const { q } = await searchParams;
  const { items, total } = await listCustomers(auth.organization.organizationId, { search: q });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description={`${total} client${total > 1 ? 's' : ''} enregistré${total > 1 ? 's' : ''}.`}
        actions={<CustomerDialog />}
      />

      <form method="get" className="max-w-sm">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Rechercher un client…"
          aria-label="Rechercher un client"
        />
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? 'Aucun client trouvé.' : 'Aucun client pour le moment.'}
          description={
            q
              ? 'Essayez un autre nom, un email ou une ville.'
              : 'Ajoutez votre premier client pour pouvoir lui envoyer un devis.'
          }
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
                        'Aucune coordonnée'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-[12px] text-subtle">Devis</p>
                      <p className="text-[13.5px] font-medium text-ink tabular">
                        {customer.acceptedCount}/{customer.quoteCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-subtle">CA</p>
                      <p className="text-[13.5px] font-medium text-ink tabular">
                        {formatCents(customer.revenueCents, { compact: true })}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[12px] text-subtle">Client depuis</p>
                      <p className="text-[13.5px] text-muted">{formatDate(customer.createdAt)}</p>
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
