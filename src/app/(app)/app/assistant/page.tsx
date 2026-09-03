import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { aiCapabilities } from '@/lib/ai';
import { PageHeader } from '@/components/ui/page';
import { getTranslations } from '@/lib/i18n';
import { AssistantChat } from './chat';

export const metadata: Metadata = { title: 'Assistant' };

export default async function AssistantPage() {
  await requirePermission('quote:read');
  const { t } = await getTranslations();
  const capabilities = aiCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.assistant.title}
        description={t.assistant.subtitle}
      />
      <AssistantChat degraded={!capabilities.generation} />
    </div>
  );
}
