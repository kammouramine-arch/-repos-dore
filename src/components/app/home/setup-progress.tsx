import Link from 'next/link';
import { BookOpen, Building2, Check, ChevronRight, Users } from 'lucide-react';
import { setupProgress, type SetupStatus } from '@devisia/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/lib/i18n/dictionaries/fr';

/**
 * « À compléter » : la mise en route de l'atelier en trois gestes, identique à
 * l'application iOS. Des raccourcis, jamais des reproches.
 */
export function SetupProgress({ status, t }: { status: SetupStatus; t: Dictionary }) {
  const progress = setupProgress(status);
  const items = [
    { key: 'business', done: status.business, icon: Building2, label: t.dashboard.setupBusiness, hint: t.dashboard.setupBusinessHint, href: '/app/parametres/entreprise' },
    { key: 'catalogue', done: status.catalogue, icon: BookOpen, label: t.dashboard.setupCatalogue, hint: t.dashboard.setupCatalogueHint, href: '/app/catalogue' },
    { key: 'clients', done: status.clients, icon: Users, label: t.dashboard.setupClients, hint: t.dashboard.setupClientsHint, href: '/app/clients' },
  ];
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">{t.dashboard.setupTitle}</h2>
          <span className={cn('text-[12.5px] font-semibold tabular', progress.complete ? 'text-success' : 'text-accent')}>
            {progress.done}/{progress.total}
          </span>
        </div>
        <Progress value={(progress.done / progress.total) * 100} />
        <ul className="-mx-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="pressable flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface"
                aria-label={item.label}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]',
                    item.done ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent',
                  )}
                >
                  {item.done ? <Check className="h-4 w-4" aria-hidden /> : <item.icon className="h-4 w-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[13.5px] font-semibold', item.done ? 'text-muted line-through' : 'text-ink')}>{item.label}</span>
                  <span className="block text-[12.5px] text-muted">{item.done ? t.dashboard.done : item.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
