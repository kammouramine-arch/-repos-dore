import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
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
          Automatisations et notifications
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          DEVISIA prépare les relances à votre place. Vous gardez la main : par défaut, chaque
          message attend votre validation avant d’être envoyé.
        </p>
      </header>

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
