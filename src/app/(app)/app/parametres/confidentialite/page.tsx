import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/page-session';
import { aiCapabilities } from '@/lib/ai';
import { getAiConsent } from '@/server/services/aiConsentService';
import { PageHeader } from '@/components/ui/page';
import { getTranslations } from '@/lib/i18n';
import { AiConsentSettings } from '../ai-consent-settings';

export const metadata: Metadata = { title: 'Confidentialité et IA' };

/** Même écran que « Confidentialité et IA » sur iPhone : état, destinataire, retrait. */
export default async function PrivacySettingsPage() {
  const auth = await requireAuth();
  const { t } = await getTranslations();
  const [consent, capabilities] = await Promise.all([
    getAiConsent(auth.user.id, auth.organization.organizationId),
    Promise.resolve(aiCapabilities()),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.privacy} description={t.settings.privacyHint} />
      <AiConsentSettings initial={consent} provider={capabilities.provider} />
    </div>
  );
}
