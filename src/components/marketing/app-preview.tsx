import { ArrowUpRight, Bell, Mic, Search } from 'lucide-react';
import { LogoMark } from '@/components/brand';

/**
 * Aperçu de l'application affiché sur la page d'accueil.
 * Il reprend exactement la hiérarchie visuelle du vrai tableau de bord,
 * avec des données d'exemple explicitement présentées comme telles.
 */
export function AppPreview() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-canvas shadow-lg">
      <div className="flex items-center gap-3 border-b border-line bg-surface/70 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-[7px] border border-line bg-canvas px-3 py-1 text-[11px] text-subtle">
          <Search className="h-3 w-3" aria-hidden />
          app.devisia.fr
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[184px_1fr]">
        <aside className="hidden border-r border-line bg-surface/50 p-3.5 sm:block">
          <div className="flex items-center gap-2 px-1 pb-4">
            <LogoMark className="h-6 w-6 text-accent" />
            <span className="text-[13px] font-semibold tracking-[-0.02em]">DEVISIA</span>
          </div>
          {[
            ['Tableau de bord', true],
            ['Prospects', false],
            ['Clients', false],
            ['Devis', false],
            ['Relances', false],
            ['Catalogue', false],
          ].map(([label, active]) => (
            <div
              key={String(label)}
              className={`mb-0.5 rounded-[7px] px-2.5 py-1.5 text-[12px] ${
                active ? 'bg-canvas font-medium text-ink shadow-xs' : 'text-muted'
              }`}
            >
              {label}
            </div>
          ))}
          <div className="mt-4 rounded-[9px] bg-accent px-2.5 py-2 text-[12px] font-medium text-white">
            + Nouveau devis
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">Bonjour, Karim.</p>
              <p className="text-[12px] text-muted">Votre activité cette semaine.</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line">
              <Bell className="h-3.5 w-3.5 text-subtle" aria-hidden />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { label: 'Devis envoyés', value: '12' },
              { label: 'Consultés', value: '8' },
              { label: 'Sans réponse', value: '3' },
              { label: 'CA devisé', value: '14 850 €' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[10px] border border-line bg-canvas p-3">
                <p className="text-[10.5px] uppercase tracking-wide text-subtle">{stat.label}</p>
                <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em] tabular">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-[12px] border border-accent-border bg-accent-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-hover">
                Chiffre d’affaires à récupérer
              </p>
              <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.03em] text-accent-hover tabular">
                4 250 €
              </p>
              <p className="mt-2 text-[12px] text-accent-hover/80">
                3 devis attendent une réponse depuis plus de 48 h.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-1.5 text-[12px] font-medium text-white">
                Relancer maintenant
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </div>
            </div>

            <div className="rounded-[12px] border border-line bg-canvas p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">
                Activité récente
              </p>
              <ul className="mt-2.5 space-y-2">
                {[
                  ['Marie D. a consulté', 'DEV-2026-0038'],
                  ['Paul R. a consulté', 'DEV-2026-0042'],
                  ['Devis envoyé', 'DEV-2026-0043'],
                ].map(([label, ref]) => (
                  <li key={ref} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="truncate text-ink-soft">{label}</span>
                    <span className="shrink-0 text-subtle tabular">{ref}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-line bg-surface/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <Mic className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[12.5px] text-muted">
              « Fuite sous l’évier, remplacer le siphon, une heure de main-d’œuvre. »
            </p>
          </div>
        </div>
      </div>

      <p className="border-t border-line bg-surface/60 px-4 py-2 text-center text-[11px] text-subtle">
        Aperçu de l’interface avec des données d’exemple.
      </p>
    </div>
  );
}
