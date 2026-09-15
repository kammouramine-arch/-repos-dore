import Link from 'next/link';
import { BookOpen, Plus, Send, Sparkles, UserPlus } from 'lucide-react';
import { CustomerDialog } from '@/app/(app)/app/clients/dialog';
import type { Dictionary } from '@/lib/i18n/dictionaries/fr';

/**
 * Actions rapides : ce qu'un artisan fait chaque matin, à un clic. Le nouveau
 * devis reste l'action principale, en bleu, comme le « + » central sur iPhone.
 */
export function QuickActions({ t, followUps }: { t: Dictionary; followUps: number }) {
  const secondary = 'pressable flex items-center gap-2.5 rounded-[12px] border border-line bg-canvas px-3.5 py-3 text-[13.5px] font-medium text-ink shadow-card transition-colors hover:border-line-strong hover:bg-surface';
  return (
    <section aria-label={t.dashboard.quickActions}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Link
          href="/app/devis/nouveau"
          className="pressable flex items-center gap-2.5 rounded-[12px] bg-accent px-3.5 py-3 text-[13.5px] font-semibold text-white shadow-glow transition-colors hover:bg-accent-hover"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/18">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          {t.quotes.new}
        </Link>
        <CustomerDialog
          trigger={
            <button type="button" className={`${secondary} w-full`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                <UserPlus className="h-4 w-4" aria-hidden />
              </span>
              {t.dashboard.newCustomer}
            </button>
          }
        />
        <Link href="/app/catalogue" className={secondary}>
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
            <BookOpen className="h-4 w-4" aria-hidden />
          </span>
          {t.dashboard.addToCatalogue}
        </Link>
        <Link href="/app/relances" className={secondary}>
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
            {followUps > 0 ? <Send className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          </span>
          <span className="flex items-center gap-2">
            {t.dashboard.followUp}
            {followUps > 0 ? (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10.5px] font-semibold leading-none text-white tabular">{followUps}</span>
            ) : null}
          </span>
        </Link>
      </div>
    </section>
  );
}
