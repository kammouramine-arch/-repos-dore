import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { format } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n/dictionaries/fr';
import type { HomeOverview } from '@/server/services/homeService';

/** Où en sont les devis : une barre par statut, cliquable vers la liste filtrée. */
export function StatusBreakdown({ counts, total, t }: { counts: HomeOverview['statusCounts']; total: number; t: Dictionary }) {
  const rows = [
    { key: 'BROUILLON', label: t.quotes.drafts, value: counts.BROUILLON, color: 'bg-subtle', href: '/app/devis?statut=BROUILLON' },
    { key: 'ENVOYE', label: t.quotes.sent, value: counts.ENVOYE, color: 'bg-info', href: '/app/devis?statut=ENVOYE' },
    { key: 'CONSULTE', label: t.quotes.viewed, value: counts.CONSULTE, color: 'bg-accent', href: '/app/devis?statut=CONSULTE' },
    { key: 'EXPIRE', label: t.dashboard.expired, value: counts.EXPIRE, color: 'bg-warning', href: '/app/devis?statut=EXPIRE' },
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">{t.dashboard.statusBreakdown}</h2>
          <span className="text-[12.5px] text-subtle tabular">{format(t.dashboard.quotesTotal, { count: total })}</span>
        </div>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <Link href={row.href} className="group block" aria-label={`${row.label} · ${row.value}`}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-ink-soft group-hover:text-ink">
                    <span className={`h-2 w-2 rounded-full ${row.color}`} aria-hidden />
                    {row.label}
                  </span>
                  <span className="font-semibold text-ink tabular">{row.value}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${row.color} transition-[width] duration-500`} style={{ width: `${(row.value / max) * 100}%` }} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
