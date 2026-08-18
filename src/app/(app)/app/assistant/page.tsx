import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { aiCapabilities } from '@/lib/ai';
import { PageHeader } from '@/components/ui/page';
import { AssistantChat } from './chat';

export const metadata: Metadata = { title: 'Assistant' };

export default async function AssistantPage() {
  await requirePermission('quote:read');
  const capabilities = aiCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant"
        description="Posez vos questions sur votre activité. Les réponses s’appuient uniquement sur vos données réelles."
      />
      <AssistantChat degraded={!capabilities.generation} />
    </div>
  );
}
