import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/page-session';
import { can } from '@/lib/auth/permissions';
import { PageHeader } from '@/components/ui/page';
import { getTranslations } from '@/lib/i18n';
import { DataControls } from './controls';

export const metadata: Metadata = { title: 'Données et sécurité' };

/** Exports et suppression du compte : les mêmes opérations que sur iPhone, aux mêmes adresses d'API. */
export default async function DataSettingsPage() {
  const auth = await requireAuth();
  const { t } = await getTranslations();
  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.data} description={t.settings.dataHint} />
      <DataControls canExportBusiness={can(auth.organization.role, 'organization:export')} />
    </div>
  );
}
