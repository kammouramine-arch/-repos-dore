import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/page-session';
import { aiCapabilities } from '@/lib/ai';
import { PageHeader } from '@/components/ui/page';
import { getTranslations } from '@/lib/i18n';
import { AssistantChat } from './chat';
import { getAiConsent } from '@/server/services/aiConsentService';

export const metadata: Metadata = { title: 'Assistant' };

export default async function AssistantPage() {
  const auth = await requirePermission('quote:read');
  const { t } = await getTranslations();
  const capabilities = aiCapabilities();
  const aiConsent = await getAiConsent(auth.user.id, auth.organization.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.assistant.title}
        description={t.assistant.subtitle}
      />
      <AssistantChat degraded={!capabilities.generation} provider={capabilities.provider} aiConsent={aiConsent} />
    </div>
  );
}
