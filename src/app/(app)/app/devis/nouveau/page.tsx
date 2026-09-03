import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { aiCapabilities } from '@/lib/ai';
import { fullName } from '@/lib/utils';
import { NewQuoteFlow } from './flow';

export const metadata: Metadata = { title: 'Nouveau devis' };

export default async function NewQuotePage() {
  const auth = await requirePermission('quote:write');
  const organizationId = auth.organization.organizationId;

  const [customers, profile] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.businessProfile.findUnique({ where: { organizationId } }),
  ]);

  const capabilities = aiCapabilities();

  return (
    <div className="space-y-6">
      <Link
        href="/app/devis"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Retour aux devis
      </Link>

      <NewQuoteFlow
        customers={customers.map((customer) => ({
          id: customer.id,
          name: fullName(customer.firstName, customer.lastName, customer.companyName),
          email: customer.email,
        }))}
        defaults={{
          terms: profile?.quoteTerms ?? '',
          paymentTerms: profile?.paymentTerms ?? '',
          validityDays: profile?.quoteValidityDays ?? 30,
          vatExempt: profile?.vatStatus === 'FRANCHISE_EN_BASE',
        }}
        capabilities={capabilities}
      />
    </div>
  );
}
