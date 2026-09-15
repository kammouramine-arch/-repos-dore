'use client';

import * as React from 'react';
import { Camera, Check, Eye, FileText, Mic, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from './motion';

/**
 * Le parcours DEVISERA, montré plutôt qu'expliqué.
 *
 * Six étapes ; chacune affiche un extrait du produit. Les étapes avancent
 * seules toutes les quelques secondes, s'arrêtent dès qu'on en choisit une
 * ou qu'on survole, et restent accessibles au clavier (liste d'onglets).
 */
const STEPS = [
  {
    id: 'parlez',
    title: 'Parlez',
    body: 'Décrivez le chantier comme à votre apprenti. Le micro écoute, DEVISERA écrit.',
    icon: Mic,
  },
  {
    id: 'ajoutez',
    title: 'Ajoutez',
    body: 'Une photo du tableau, de la fuite, de l’existant : l’état des lieux entre dans le devis.',
    icon: Camera,
  },
  {
    id: 'structure',
    title: 'DEVISERA structure',
    body: 'Lignes, quantités, vos prix de catalogue, TVA et totaux calculés par le logiciel.',
    icon: Sparkles,
  },
  {
    id: 'envoyez',
    title: 'Envoyez',
    body: 'Un PDF à votre image et un lien client, envoyés depuis le chantier.',
    icon: Send,
  },
  {
    id: 'suivez',
    title: 'Suivez',
    body: 'Vous savez quand le client ouvre le devis, et combien attend une réponse.',
    icon: Eye,
  },
  {
    id: 'relancez',
    title: 'Relancez',
    body: 'Un message prêt, au bon moment. Vous validez, DEVISERA envoie.',
    icon: FileText,
  },
] as const;

const HOLD = 4200;

export function WorkflowShowcase() {
  const reduced = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [held, setHeld] = React.useState(false);
  const [progressKey, setProgressKey] = React.useState(0);
  const hostRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (reduced || held) return undefined;
    const element = hostRef.current;
    if (!element) return undefined;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!visible || document.hidden) return;
      timer = setTimeout(() => {
        setIndex((current) => (current + 1) % STEPS.length);
        setProgressKey((key) => key + 1);
        schedule();
      }, HOLD);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      schedule();
    }, { threshold: 0.35 });
    observer.observe(element);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [reduced, held]);

  const choose = (next: number) => {
    setIndex(next);
    setHeld(true);
    setProgressKey((key) => key + 1);
  };

  const step = STEPS[index]!;

  return (
    <div ref={hostRef} className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14" onMouseEnter={() => setHeld(true)}>
      <ol role="tablist" aria-label="Étapes du parcours" className="space-y-1">
        {STEPS.map((item, itemIndex) => {
          const active = itemIndex === index;
          return (
            <li key={item.id} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`workflow-panel-${item.id}`}
                id={`workflow-tab-${item.id}`}
                onClick={() => choose(itemIndex)}
                onFocus={() => choose(itemIndex)}
                className={cn(
                  'group relative flex w-full items-start gap-4 rounded-[14px] px-4 py-3.5 text-left transition-colors',
                  active ? 'bg-canvas shadow-card ring-1 ring-line' : 'hover:bg-canvas/60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] transition-colors',
                    active ? 'bg-accent text-white shadow-glow' : 'bg-surface-2 text-ink-soft group-hover:bg-accent-soft group-hover:text-accent',
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-subtle tabular">0{itemIndex + 1}</span>
                    <span className={cn('text-[15px] font-semibold', active ? 'text-ink' : 'text-ink-soft')}>{item.title}</span>
                  </span>
                  <span
                    className={cn(
                      'block overflow-hidden text-[13.5px] leading-relaxed text-muted transition-all duration-500',
                      active ? 'mt-1 max-h-24 opacity-100' : 'mt-0 max-h-0 opacity-0',
                    )}
                  >
                    {item.body}
                  </span>
                  {active && !reduced ? (
                    <span className="mt-2.5 block h-[3px] w-full overflow-hidden rounded-full bg-line" aria-hidden>
                      <span
                        key={progressKey}
                        className="block h-full rounded-full bg-accent"
                        style={{ animation: held ? 'none' : `devisia-progress ${HOLD}ms linear forwards` }}
                      />
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-[radial-gradient(closest-side,rgba(47,82,232,0.12),rgba(47,82,232,0))] blur-2xl" aria-hidden />
        <div
          role="tabpanel"
          id={`workflow-panel-${step.id}`}
          aria-labelledby={`workflow-tab-${step.id}`}
          className="relative overflow-hidden rounded-[20px] border border-line bg-canvas p-5 shadow-[0_24px_60px_-28px_rgba(10,26,74,0.32)] sm:p-7 lg:min-h-[420px]"
        >
          <div key={step.id} className="animate-in-up">
            <WorkflowPanel step={step.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{title}</p>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function WorkflowPanel({ step }: { step: (typeof STEPS)[number]['id'] }) {
  switch (step) {
    case 'parlez':
      return (
        <Frame title="Nouveau devis" badge={<span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-hover">Écoute</span>}>
          <div className="flex items-center gap-4 rounded-[14px] border border-line bg-surface/60 p-4">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow">
              <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" style={{ animationDuration: '1.8s' }} aria-hidden />
              <Mic className="relative h-5 w-5" aria-hidden />
            </span>
            <span className="flex h-8 items-end gap-[3px]" aria-hidden>
              {[8, 16, 24, 14, 28, 18, 10, 22, 12, 26, 16, 8].map((height, index) => (
                <span key={index} className="wave-bar block w-[3px] rounded-full bg-accent" style={{ height, animationDelay: `${index * 0.09}s` }} />
              ))}
            </span>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            « Le client a une fuite sous l’évier. Il faut remplacer le siphon, vérifier les raccordements et prévoir une heure de main-d’œuvre. »
            <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent animate-pulse-soft" aria-hidden />
          </p>
        </Frame>
      );
    case 'ajoutez':
      return (
        <Frame title="Photos du chantier" badge={<span className="text-[11.5px] text-subtle">2 / 6</span>}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sous-évier', tone: 'from-[#dbe3fb] to-[#f3f5fb]' },
              { label: 'Siphon existant', tone: 'from-[#e5e9f5] to-[#f7f8fb]' },
            ].map((photo, index) => (
              <div key={photo.label} className="animate-in-up overflow-hidden rounded-[12px] border border-line" style={{ animationDelay: `${index * 140}ms` }}>
                <div className={cn('h-20 bg-gradient-to-br', photo.tone)} />
                <p className="px-2.5 py-1.5 text-[11.5px] text-muted">{photo.label}</p>
              </div>
            ))}
            <button type="button" tabIndex={-1} className="flex h-full min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-line-strong text-[11.5px] text-subtle">
              <Camera className="h-4 w-4" aria-hidden />
              Ajouter
            </button>
          </div>
          <p className="mt-4 rounded-[10px] bg-surface px-3.5 py-2.5 text-[12.5px] text-muted">
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-accent" aria-hidden />
            Accès sous meuble étroit détecté : temps de pose ajusté.
          </p>
        </Frame>
      );
    case 'structure':
      return (
        <Frame title="Devis DEV-2026-0044" badge={<span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-muted">Brouillon</span>}>
          <ul className="divide-y divide-line">
            {[
              ['Siphon évier laiton', '1 u × 32,00 €', '32,00 €'],
              ['Flexible sanitaire inox 50 cm', '2 u × 15,00 €', '30,00 €'],
              ['Main-d’œuvre plombier', '1 h × 55,00 €', '55,00 €'],
              ['Déplacement et prise en charge', '1 u × 45,00 €', '45,00 €'],
            ].map(([label, detail, total], index) => (
              <li key={label} className="flex items-center justify-between gap-3 py-2.5 animate-in-up" style={{ animationDelay: `${index * 120}ms` }}>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{label}</span>
                  <span className="block text-[12px] text-subtle tabular">{detail}</span>
                </span>
                <span className="text-[13.5px] font-semibold text-ink tabular">{total}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3 animate-in-up" style={{ animationDelay: '520ms' }}>
            <span className="text-[12.5px] text-muted">TVA 10 % · 16,20 €</span>
            <span className="text-[18px] font-bold tracking-[-0.02em] text-ink tabular">178,20 € TTC</span>
          </div>
        </Frame>
      );
    case 'envoyez':
      return (
        <Frame title="Envoyer le devis">
          <div className="rounded-[14px] border border-line bg-surface/60 p-4">
            <p className="text-[12px] text-subtle">Destinataire</p>
            <p className="mt-0.5 text-[14px] font-medium text-ink">sophie.lemoine@exemple.fr</p>
            <p className="mt-3 text-[12px] text-subtle">Message</p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-soft">Bonjour Sophie, voici le devis pour le remplacement du siphon. Je reste disponible pour toute question.</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-glow">
                <Send className="h-4 w-4" aria-hidden />
                Envoyer maintenant
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                <FileText className="h-4 w-4" aria-hidden />
                PDF joint
              </span>
            </div>
          </div>
        </Frame>
      );
    case 'suivez':
      return (
        <Frame title="Suivi du devis DEV-2026-0044">
          <ol className="relative space-y-4 border-l border-line pl-5">
            {[
              ['Envoyé au client', 'aujourd’hui, 09:12', 'bg-info'],
              ['Ouvert par le client', 'aujourd’hui, 09:47', 'bg-accent'],
              ['Relance prévue', 'dans 3 jours si pas de réponse', 'bg-line-strong'],
            ].map(([label, when, dot], index) => (
              <li key={label} className="relative animate-in-up" style={{ animationDelay: `${index * 160}ms` }}>
                <span className={cn('absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-canvas', dot, index === 1 && 'pulse-dot')} aria-hidden />
                <p className="text-[13.5px] font-medium text-ink">{label}</p>
                <p className="text-[12px] text-subtle">{when}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-accent-border bg-accent-soft px-4 py-3 text-[13px] text-accent-hover">
            <Eye className="h-4 w-4 shrink-0" aria-hidden />
            Sophie L. a consulté le devis 2 fois. Bon moment pour appeler.
          </div>
        </Frame>
      );
    case 'relancez':
      return (
        <Frame title="Relance" badge={<span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">Prête</span>}>
          <div className="rounded-[14px] border border-line bg-surface/60 p-4">
            <p className="text-[12px] text-subtle">Objet</p>
            <p className="mt-0.5 text-[14px] font-medium text-ink">Votre devis DEV-2026-0044 — remplacement du siphon</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">Bonjour Sophie, avez-vous pu regarder le devis envoyé mardi ? Je peux intervenir dès la semaine prochaine si cela vous convient.</p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12.5px] text-muted">
              <Check className="h-4 w-4 text-success" aria-hidden />
              Ton professionnel · envoi après votre validation
            </span>
            <span className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-glow">
              <Send className="h-4 w-4" aria-hidden />
              Envoyer la relance
            </span>
          </div>
        </Frame>
      );
    default:
      return null;
  }
}
