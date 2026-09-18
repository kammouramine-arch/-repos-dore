import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Globe } from 'lucide-react';
import { requireAuth } from '@/lib/auth/page-session';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import { PLANS } from '@/lib/billing/plans';
import { PageHeader } from '@/components/ui/page';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocaleSwitcher } from './locale-switcher';
import { settingsSections } from './settings-sections';
import { getLocale, getDictionary } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Paramètres' };

/** Hub des paramètres : chaque section en une carte, comme « Mon espace » sur iPhone. */
export default async function SettingsPage() {
  const auth = await requireAuth();
  const [subscription, locale] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: auth.organization.organizationId } }),
    getLocale(),
  ]);
  const t = getDictionary(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.settings.title}
        description={`${auth.organization.organizationName} · ${ROLE_LABELS[auth.organization.role]}`}
        actions={
          subscription ? (
            <Badge tone={subscription.status === 'active' ? 'success' : 'accent'}>
              {PLANS[subscription.plan].name}
              {subscription.status === 'trialing' ? ` — ${t.common.trial}` : ''}
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {settingsSections(t).map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="pressable group flex items-center gap-3.5 rounded-[16px] border border-line bg-canvas px-4 py-4 shadow-card transition-colors hover:border-accent-border hover:bg-accent-soft/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
              <section.icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-ink">{section.label}</span>
              <span className="block truncate text-[12.5px] text-muted">{section.hint}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="h-[18px] w-[18px] text-subtle" aria-hidden />
            <div>
              <p className="text-[14px] font-medium text-ink">{t.settings.language}</p>
              <p className="text-[12.5px] text-muted">{t.settings.languageHint}</p>
            </div>
          </div>
          <LocaleSwitcher current={locale} />
        </div>
      </Card>
    </div>
  );
}
