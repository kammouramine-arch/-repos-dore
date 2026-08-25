import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { listPriceBook } from '@/server/services/priceBookService';
import { can } from '@/lib/auth/permissions';
import { PageHeader } from '@/components/ui/page';
import { getTranslations } from '@/lib/i18n';
import { EmptyState } from '@/components/ui/feedback';
import { PriceBookTable } from './table';
import { PriceBookActions } from './actions';

export const metadata: Metadata = { title: 'Catalogue de prix' };

export default async function PriceBookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string }>;
}) {
  const auth = await requirePermission('pricebook:read');
  const { t } = await getTranslations();
  const params = await searchParams;
  const category = ['MATERIAU', 'SERVICE', 'MAIN_OEUVRE', 'PACK'].includes(params.categorie ?? '')
    ? (params.categorie as 'MATERIAU' | 'SERVICE' | 'MAIN_OEUVRE' | 'PACK')
    : undefined;

  const items = await listPriceBook(auth.organization.organizationId, {
    search: params.q,
    category,
  });

  const writable = can(auth.organization.role, 'pricebook:write');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.priceBook.title}
        description={t.priceBook.subtitle}
        actions={writable ? <PriceBookActions /> : null}
      />

      {items.length === 0 && !params.q ? (
        <EmptyState
          icon={BookOpen}
          title={t.priceBook.emptyTitle}
          description={t.priceBook.emptyBody}
          action={writable ? <PriceBookActions mode="empty" /> : null}
        />
      ) : (
        <PriceBookTable items={items} writable={writable} initialSearch={params.q ?? ''} />
      )}
    </div>
  );
}
