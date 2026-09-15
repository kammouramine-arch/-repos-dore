import { Camera, Check, Eye, FileText, Mic, Send, Smartphone, Users, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Petits extraits de l'interface pour les cartes de fonctionnalités. Statiques
 * ou très légèrement animés (CSS seulement), toujours avec la vraie hiérarchie
 * du produit et des données d'exemple.
 */
export function VoiceVisual() {
  return (
    <div className="rounded-[14px] border border-line bg-surface/70 p-4">
      <div className="flex items-center gap-4">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow">
          <Mic className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex h-8 flex-1 items-end gap-[3px]" aria-hidden>
          {[6, 12, 22, 14, 28, 18, 10, 24, 12, 26, 16, 8, 20, 10, 6].map((height, index) => (
            <span key={index} className="wave-bar block w-[3px] rounded-full bg-accent/80" style={{ height, animationDelay: `${index * 0.08}s` }} />
          ))}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">« … remplacer le siphon, vérifier les raccords, une heure de main-d’œuvre. »</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['Siphon évier', 'Main-d’œuvre · 1 h', 'Déplacement'].map((chip, index) => (
          <span key={chip} className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-accent-hover animate-in-up" style={{ animationDelay: `${index * 120}ms` }}>
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PhotosVisual() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {['from-[#dbe3fb] to-[#f3f5fb]', 'from-[#e9edf8] to-[#f9fafd]', 'from-[#d5ddf7] to-[#eef2fe]'].map((tone, index) => (
        <div key={tone} className="overflow-hidden rounded-[10px] border border-line">
          <div className={cn('h-14 bg-gradient-to-br', tone)} />
          <p className="px-2 py-1 text-[10.5px] text-subtle">Photo {index + 1}</p>
        </div>
      ))}
      <div className="col-span-3 flex items-center gap-2 rounded-[10px] bg-surface px-3 py-2 text-[12px] text-muted">
        <Camera className="h-3.5 w-3.5 text-accent" aria-hidden />
        Équipements et contraintes d’accès pris en compte.
      </div>
    </div>
  );
}

export function CatalogueVisual() {
  return (
    <ul className="divide-y divide-line rounded-[12px] border border-line bg-canvas">
      {[
        ['Installation chauffe-eau 200 L', '950,00 €', true],
        ['Main-d’œuvre plombier', '55,00 € / h', true],
        ['Groupe de sécurité', '42,00 €', false],
      ].map(([label, price, applied]) => (
        <li key={String(label)} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
            <Wallet className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[12.5px] font-medium text-ink tabular">
            {price}
            {applied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StatusFlowVisual() {
  const steps = [
    { label: 'Envoyé', icon: Send, tone: 'bg-info-soft text-info border-info/20' },
    { label: 'Consulté', icon: Eye, tone: 'bg-accent-soft text-accent-hover border-accent-border' },
    { label: 'Relancé', icon: FileText, tone: 'bg-warning-soft text-warning border-warning/20' },
    { label: 'Accepté', icon: Check, tone: 'bg-success-soft text-success border-success/20' },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {steps.map((step) => (
          <span key={step.label} className={cn('flex items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-[12px] font-medium', step.tone)}>
            <step.icon className="h-3.5 w-3.5" aria-hidden />
            {step.label}
          </span>
        ))}
      </div>
      <ol className="mt-3 space-y-1.5 rounded-[12px] border border-line bg-canvas p-3">
        {[
          ['Envoyé', 'mar. 09:12', 'bg-info'],
          ['Consulté 2 fois', 'mar. 09:47', 'bg-accent'],
          ['Relance J+3', 'programmée', 'bg-line-strong'],
        ].map(([label, when, dot]) => (
          <li key={label} className="flex items-center gap-2.5 text-[12px]">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
            <span className="flex-1 truncate text-ink">{label}</span>
            <span className="shrink-0 text-subtle tabular">{when}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function RecoveryVisual() {
  return (
    <div className="rounded-[14px] border border-accent-border bg-accent-soft/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-hover">À récupérer</p>
      <p className="mt-1 text-[26px] font-bold leading-none tracking-[-0.03em] text-accent-hover tabular">4 850 €</p>
      <ul className="mt-3 space-y-1.5">
        {[
          ['M. Martin', '1 950 €', '5 j'],
          ['Boulangerie Lemoine', '2 100 €', '3 j'],
        ].map(([name, amount, days]) => (
          <li key={name} className="flex items-center justify-between rounded-[9px] bg-canvas px-3 py-2 text-[12.5px]">
            <span className="truncate text-ink">{name}</span>
            <span className="shrink-0 tabular">
              <span className="font-semibold text-ink">{amount}</span>
              <span className="ml-2 text-subtle">{days}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClientsVisual() {
  return (
    <ul className="space-y-1.5">
      {[
        ['Sophie Lemoine', 'Boulangerie · Lyon', '3 devis'],
        ['Marie Delaunay', 'Villeurbanne', '2 devis'],
        ['Ahmed Ferrand', 'Bron', '1 devis'],
      ].map(([name, meta, count]) => (
        <li key={name} className="flex items-center gap-3 rounded-[10px] border border-line bg-canvas px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">{name[0]}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-ink">{name}</span>
            <span className="block truncate text-[11px] text-subtle">{meta}</span>
          </span>
          <span className="flex items-center gap-1 text-[11.5px] text-muted">
            <Users className="h-3 w-3" aria-hidden />
            {count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PdfVisual() {
  return (
    <div className="mx-auto w-[78%] rounded-[8px] border border-line bg-canvas p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="h-2 w-12 rounded bg-accent/70" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-subtle">Devis</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {[100, 84, 92, 70].map((width, index) => (
          <span key={index} className="block h-1.5 rounded bg-line" style={{ width: `${width}%` }} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
        <span className="h-1.5 w-10 rounded bg-line" />
        <span className="text-[10px] font-bold text-ink tabular">178,20 €</span>
      </div>
    </div>
  );
}

export function MobileVisual() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-12 shrink-0 rounded-[10px] border-2 border-ink/80 bg-[linear-gradient(180deg,#2F52E8_0%,#eef2ff_70%,#fff_100%)] p-1.5 shadow-card">
        <span className="block h-1 w-5 rounded-full bg-white/70" />
        <span className="mt-2 block h-6 rounded-[5px] bg-white/90" />
        <span className="mt-1.5 block h-3 rounded-[4px] bg-white/80" />
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        <Smartphone className="mr-1 inline h-3.5 w-3.5 text-accent" aria-hidden />
        Même compte sur iPhone et sur le web. Dictez sur le chantier, finissez au bureau.
      </p>
    </div>
  );
}
