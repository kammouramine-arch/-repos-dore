import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page';
import { requirePermission } from '@/lib/auth/page-session';
import { prisma } from '@/lib/prisma';
import { AutomationSettings } from './settings';

export const metadata: Metadata = { title: 'Automatisations' };

export default async function AutomationsPage() {
  const auth = await requirePermission('settings:read');
  const organizationId = auth.organization.organizationId;

  const [automations, settings] = await Promise.all([
    prisma.automation.findMany({ where: { organizationId }, orderBy: { delayHours: 'asc' } }),
    prisma.settings.findUnique({ where: { organizationId } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Automatisations et notifications"
        description="DEVISERA prépare les relances à votre place. Vous gardez la main : par défaut, chaque message attend votre validation avant d’être envoyé."
      />

      <AutomationSettings
        automations={automations.map((automation) => ({
          id: automation.id,
          name: automation.name,
          trigger: automation.trigger,
          delayHours: automation.delayHours,
          isActive: automation.isActive,
          requireApproval: automation.requireApproval,
        }))}
        settings={{
          notifyOnQuoteViewed: settings?.notifyOnQuoteViewed ?? true,
          notifyOnQuoteAccepted: settings?.notifyOnQuoteAccepted ?? true,
          notifyOnQuoteRefused: settings?.notifyOnQuoteRefused ?? true,
          notifyOnNewLead: settings?.notifyOnNewLead ?? true,
          notifyByEmail: settings?.notifyByEmail ?? true,
          followUpsEnabled: settings?.followUpsEnabled ?? true,
          publicLeadFormEnabled: settings?.publicLeadFormEnabled ?? true,
          aiSignature: settings?.aiSignature ?? '',
        }}
      />
    </div>
  );
}
