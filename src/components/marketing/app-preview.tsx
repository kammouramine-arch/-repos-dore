'use client';

import * as React from 'react';
import { ArrowUpRight, Bell, Eye, Mic, Search, Send, Sparkles } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { cn } from '@/lib/utils';
import { useReducedMotion } from './motion';

/**
 * Aperçu vivant de l'application.
 *
 * Même hiérarchie que le vrai accueil, données d'exemple annoncées comme
 * telles. Une courte boucle, lente et réaliste, montre le logiciel en usage :
 * un devis est préparé, envoyé, consulté ; le montant à récupérer bouge ;
 * l'activité s'enrichit ; puis tout revient au calme. Sous réduction de
 * mouvement, l'écran reste sur son état final, sans boucle.
 */
type Phase = 'idle' | 'dictating' | 'preparing' | 'created' | 'sent' | 'viewed' | 'recovered';

const SCENARIO: { phase: Phase; hold: number }[] = [
  { phase: 'idle', hold: 2200 },
  { phase: 'dictating', hold: 2600 },
  { phase: 'preparing', hold: 1800 },
  { phase: 'created', hold: 1600 },
  { phase: 'sent', hold: 2200 },
  { phase: 'viewed', hold: 2400 },
  { phase: 'recovered', hold: 3200 },
];

const ORDER: Phase[] = SCENARIO.map((step) => step.phase);
const at = (phase: Phase, target: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(target);

export function AppPreview({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [loopPhase, setPhase] = React.useState<Phase>('idle');
  // Sans mouvement, l'aperçu montre directement l'état final.
  const phase: Phase = reduced ? 'recovered' : loopPhase;
  const [paused, setPaused] = React.useState(false);
  const hostRef = React.useRef<HTMLDivElement>(null);

  // La boucle ne tourne que lorsque l'aperçu est visible et que l'onglet est actif.
  React.useEffect(() => {
    if (reduced) return undefined;
    const element = hostRef.current;
    if (!element) return undefined;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let index = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (!visible || paused || document.hidden) return;
      timer = setTimeout(() => {
        index = (index + 1) % SCENARIO.length;
        setPhase(SCENARIO[index]!.phase);
        schedule();
      }, SCENARIO[index]!.hold);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      schedule();
    }, { threshold: 0.3 });
    observer.observe(element);
    const onVisibility = () => schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced, paused]);

  const recovered = at(phase, 'recovered');
  const sentCount = at(phase, 'sent') ? 13 : 12;
  const viewedCount = at(phase, 'viewed') ? 9 : 8;
  const waiting = recovered ? 2 : at(phase, 'sent') ? 4 : 3;
  const amount = recovered ? '2 300 €' : at(phase, 'sent') ? '6 200 €' : '4 250 €';

  return (
    <div
      ref={hostRef}
      className={cn('relative overflow-hidden rounded-[20px] border border-line/90 bg-canvas shadow-[0_30px_80px_-30px_rgba(10,26,74,0.35),0_10px_30px_-14px_rgba(10,26,74,0.18)]', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="img"
      aria-label="Aperçu de l’application DEVISERA : un devis est dicté, préparé, envoyé puis consulté par le client."
    >
      {/* Barre de fenêtre */}
      <div className="flex items-center gap-3 border-b border-line bg-surface/70 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-[7px] border border-line bg-canvas px-3 py-1 text-[11px] text-subtle">
          <Search className="h-3 w-3" aria-hidden />
          app.devisera.fr
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[176px_1fr]">
        <aside className="hidden border-r border-line bg-surface/50 p-3.5 sm:block">
          <div className="flex items-center gap-2 px-1 pb-4">
            <LogoMark className="h-6 w-6 text-accent" />
            <span className="text-[13px] font-semibold tracking-[-0.02em]">DEVISERA</span>
          </div>
          {[
            ['Accueil', true],
            ['Devis', false],
            ['Clients', false],
            ['Relances', false],
            ['Prospects', false],
            ['Catalogue', false],
          ].map(([label, active]) => (
            <div
              key={String(label)}
              className={cn('mb-0.5 rounded-[7px] px-2.5 py-1.5 text-[12px]', active ? 'bg-accent-soft font-medium text-accent-hover' : 'text-muted')}
            >
              {label}
            </div>
          ))}
          <div className="mt-4 rounded-[9px] bg-accent px-2.5 py-2 text-[12px] font-medium text-white shadow-glow">+ Nouveau devis</div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">Bonjour Karim.</p>
              <p className="text-[12px] text-muted">
                {recovered ? '2 devis attendent une réponse.' : at(phase, 'sent') ? '4 devis attendent une réponse.' : '3 devis attendent une réponse. Une relance prend une minute.'}
              </p>
            </div>
            <div className="relative flex h-7 w-7 items-center justify-center rounded-[7px] border border-line">
              <Bell className="h-3.5 w-3.5 text-subtle" aria-hidden />
              {at(phase, 'viewed') ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-canvas" /> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { label: 'Devis envoyés', value: String(sentCount) },
              { label: 'Consultés', value: String(viewedCount) },
              { label: 'Sans réponse', value: String(waiting) },
              { label: 'CA devisé', value: at(phase, 'sent') ? '15 800 €' : '14 850 €' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[10px] border border-line bg-canvas p-3">
                <p className="text-[10.5px] uppercase tracking-wide text-subtle">{stat.label}</p>
                <p key={stat.value} className="mt-1 text-[17px] font-semibold tracking-[-0.02em] tabular animate-fade">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <div className={cn('rounded-[12px] border p-4 transition-colors duration-700', recovered ? 'border-success/30 bg-success-soft' : 'border-accent-border bg-accent-soft')}>
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.1em]', recovered ? 'text-success' : 'text-accent-hover')}>Chiffre d’affaires à récupérer</p>
              <p key={amount} className={cn('mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular animate-fade', recovered ? 'text-success' : 'text-accent-hover')}>
                {amount}
              </p>
              <p className={cn('mt-2 text-[12px]', recovered ? 'text-success/80' : 'text-accent-hover/80')}>
                {recovered ? 'Relance envoyée à M. Martin · 1 950 € en cours de réponse.' : `${waiting} devis attendent une réponse depuis plus de 48 h.`}
              </p>
              <div className={cn('mt-3 inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-white transition-colors duration-500', recovered ? 'bg-success' : 'bg-accent')}>
                {recovered ? 'Relance envoyée' : 'Relancer maintenant'}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </div>
            </div>

            <div className="rounded-[12px] border border-line bg-canvas p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Activité récente</p>
              <ul className="mt-2.5 space-y-2">
                {at(phase, 'viewed') ? (
                  <li className="flex items-center justify-between gap-3 text-[12px] animate-in-up">
                    <span className="flex items-center gap-1.5 truncate font-medium text-accent-hover">
                      <Eye className="h-3 w-3" aria-hidden />
                      Sophie L. a consulté
                    </span>
                    <span className="shrink-0 text-subtle tabular">DEV-0044</span>
                  </li>
                ) : null}
                {at(phase, 'sent') ? (
                  <li className="flex items-center justify-between gap-3 text-[12px] animate-in-up">
                    <span className="flex items-center gap-1.5 truncate text-ink-soft">
                      <Send className="h-3 w-3 text-accent" aria-hidden />
                      Devis envoyé
                    </span>
                    <span className="shrink-0 text-subtle tabular">DEV-0044</span>
                  </li>
                ) : null}
                {[
                  ['Marie D. a consulté', 'DEV-0038'],
                  ['Paul R. a consulté', 'DEV-0042'],
                  ['Devis envoyé', 'DEV-0043'],
                ]
                  .slice(0, at(phase, 'viewed') ? 1 : at(phase, 'sent') ? 2 : 3)
                  .map(([label, ref]) => (
                    <li key={ref} className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="truncate text-ink-soft">{label}</span>
                      <span className="shrink-0 text-subtle tabular">{ref}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* Devis en cours : dictée → préparation → créé → envoyé → consulté */}
          <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-line bg-surface/60 p-3">
            <div className={cn('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-500', at(phase, 'created') ? 'bg-success' : 'bg-accent')}>
              {phase === 'dictating' ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" style={{ animationDuration: '1.6s' }} aria-hidden />
                  <Mic className="relative h-4 w-4" aria-hidden />
                </>
              ) : phase === 'preparing' ? (
                <Sparkles className="h-4 w-4 animate-pulse-soft" aria-hidden />
              ) : at(phase, 'created') ? (
                <Send className="h-4 w-4" aria-hidden />
              ) : (
                <Mic className="h-4 w-4" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {phase === 'idle' ? (
                <p className="text-[12.5px] text-muted">Appuyez et décrivez le chantier.</p>
              ) : phase === 'dictating' ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-4 items-end gap-[3px]" aria-hidden>
                    {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                      <span key={index} className="wave-bar block w-[3px] rounded-full bg-accent" style={{ height: `${[8, 14, 16, 10, 16, 12, 8][index]}px`, animationDelay: `${index * 0.12}s` }} />
                    ))}
                  </span>
                  <p className="truncate text-[12.5px] text-ink-soft">« Fuite sous l’évier, remplacer le siphon, une heure de main-d’œuvre. »</p>
                </div>
              ) : phase === 'preparing' ? (
                <p className="text-[12.5px] text-ink-soft">
                  DEVISERA prépare le devis <span className="text-subtle">· catalogue appliqué, TVA calculée</span>
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[12.5px] font-medium text-ink">Remplacement du siphon — cuisine</p>
                  <span className="text-[12px] text-subtle tabular">DEV-0044 · 214,50 € TTC</span>
                </div>
              )}
            </div>
            <span
              key={phase}
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium animate-fade',
                phase === 'created'
                  ? 'border-line bg-surface text-muted'
                  : phase === 'sent'
                    ? 'border-info/20 bg-info-soft text-info'
                    : at(phase, 'viewed')
                      ? 'border-accent-border bg-accent-soft text-accent-hover'
                      : 'border-transparent text-transparent',
              )}
            >
              {phase === 'created' ? 'Brouillon' : phase === 'sent' ? 'Envoyé' : at(phase, 'viewed') ? 'Consulté' : '·'}
            </span>
          </div>
        </div>
      </div>

      <p className="border-t border-line bg-surface/60 px-4 py-2 text-center text-[11px] text-subtle">Aperçu de l’interface avec des données d’exemple.</p>
    </div>
  );
}
