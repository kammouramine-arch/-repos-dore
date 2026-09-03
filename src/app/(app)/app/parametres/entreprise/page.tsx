import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { loadBusinessProfileValue } from '@/server/profile';
import { BusinessProfileForm } from '@/components/app/business-form';
import { saveBusinessProfile } from '../actions';

export const metadata: Metadata = { title: 'Entreprise' };

export default async function BusinessSettingsPage() {
  const auth = await requirePermission('settings:read');
  const value = await loadBusinessProfileValue(auth.organization.organizationId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/parametres"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Paramètres
      </Link>

      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
          Entreprise et identité
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          Ces informations apparaissent sur vos devis PDF, la page client et vos emails.
        </p>
      </header>

      <BusinessProfileForm value={value} action={saveBusinessProfile} />
    </div>
  );
}
