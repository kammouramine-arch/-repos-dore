import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import type { LeadStatus } from '@prisma/client';
import { requirePermission } from '@/lib/auth/session';
import { listLeads, LEAD_PIPELINE, LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from '@/server/services/leadService';
import { formatCents } from '@/lib/money';
import { formatRelative, format, getTranslations } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { LeadDialog } from './dialog';

export const metadata: Metadata = { title: 'Prospects' };

export default async function LeadsPage() {
  const auth = await requirePermission('lead:read');
  const { locale, t } = await getTranslations();
  const leads = await listLeads(auth.organization.organizationId);

  const byStatus = new Map<LeadStatus, typeof leads>();
  for (const status of LEAD_PIPELINE) byStatus.set(status, []);
  for (const lead of leads) byStatus.get(lead.status)?.push(lead);

  const pipelineValue = leads
    .filter((lead) => !['GAGNE', 'PERDU'].includes(lead.status))
    .reduce((acc, lead) => acc + (lead.estimatedCents ?? lead.quotedCents), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.leads.title}
        description={
          leads.length > 0
            ? format(t.leads.pipeline, { count: leads.length, amount: formatCents(pipelineValue) })
            : t.leads.subtitle
        }
        actions={<LeadDialog />}
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={t.empty.leads}
          description={t.leads.emptyBody}
          action={<LeadDialog />}
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex min-w-max gap-3">
            {LEAD_PIPELINE.map((status) => {
              const items = byStatus.get(status) ?? [];
              const total = items.reduce(
                (acc, lead) => acc + (lead.estimatedCents ?? lead.quotedCents),
                0,
              );
              return (
                <section key={status} className="w-[268px] shrink-0" aria-label={LEAD_STATUS_LABELS[status]}>
                  <header className="flex items-center justify-between px-1 pb-2.5">
                    <h2 className="text-[13px] font-semibold text-ink">
                      {LEAD_STATUS_LABELS[status]}
                      <span className="ml-1.5 text-[12px] font-normal text-subtle tabular">
                        {items.length}
                      </span>
                    </h2>
                    {total > 0 ? (
                      <span className="text-[12px] text-subtle tabular">
                        {formatCents(total, { compact: true })}
                      </span>
                    ) : null}
                  </header>

                  <div className="space-y-2 rounded-[12px] bg-surface/70 p-2">
                    {items.length === 0 ? (
                      <p className="py-6 text-center text-[12.5px] text-subtle">—</p>
                    ) : (
                      items.map((lead) => (
                        <Link
                          key={lead.id}
                          href={`/app/prospects/${lead.id}`}
                          className="block rounded-[10px] border border-line bg-canvas p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                        >
                          <p className="truncate text-[13.5px] font-medium text-ink">
                            {lead.contactName}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">
                            {lead.title}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[11.5px] text-subtle">
                              {LEAD_SOURCE_LABELS[lead.source]}
                            </span>
                            {lead.estimatedCents || lead.quotedCents ? (
                              <span className="text-[12px] font-medium text-ink tabular">
                                {formatCents(lead.estimatedCents ?? lead.quotedCents, { compact: true })}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11px] text-subtle">
                            {formatRelative(lead.lastActivityAt, locale)}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <Card className="p-5">
        <h2 className="text-[14px] font-semibold text-ink">{t.leads.publicFormTitle}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          {t.leads.publicFormBody}
        </p>
        <Link
          href="/app/parametres/prospects"
          className="mt-3 inline-block text-[13.5px] font-medium text-accent hover:underline"
        >
          {t.leads.publicFormCta}
        </Link>
      </Card>
    </div>
  );
}
