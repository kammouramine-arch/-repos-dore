import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page';
import { requirePermission } from '@/lib/auth/page-session';
import { loadBusinessProfileValue } from '@/server/profile';
import { BusinessProfileForm } from '@/components/app/business-form';
import { saveBusinessProfile } from '../actions';

export const metadata: Metadata = { title: 'Entreprise' };

export default async function BusinessSettingsPage() {
  const auth = await requirePermission('settings:read');
  const value = await loadBusinessProfileValue(auth.organization.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Entreprise et identité" description="Ces informations apparaissent sur vos devis PDF, la page client et vos emails." />

      <BusinessProfileForm value={value} action={saveBusinessProfile} />
    </div>
  );
}
