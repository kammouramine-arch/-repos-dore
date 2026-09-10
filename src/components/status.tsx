import * as React from 'react';
import type { LeadStatus, QuoteStatus } from '@prisma/client';
import { Badge } from './ui/badge';
import { fr, type Dictionary } from '@/lib/i18n/dictionaries/fr';

/**
 * Les statuts ne sont jamais signalés par la couleur seule : chaque badge
 * porte un libellé explicite et une pastille de forme distincte.
 */
const QUOTE_STATUS: Record<
  QuoteStatus,
  { label: string; tone: React.ComponentProps<typeof Badge>['tone']; dot: string }
> = {
  BROUILLON: { label: 'Brouillon', tone: 'neutral', dot: 'bg-subtle' },
  ENVOYE: { label: 'Envoyé', tone: 'info', dot: 'bg-info' },
  CONSULTE: { label: 'Consulté', tone: 'accent', dot: 'bg-accent' },
  // Les anciens statuts de décision restent lisibles en base, mais sont
  // désormais présentés comme une simple consultation dans le produit.
  ACCEPTE: { label: 'Consulté', tone: 'accent', dot: 'bg-accent' },
  REFUSE: { label: 'Consulté', tone: 'accent', dot: 'bg-accent' },
  MODIFICATION_DEMANDEE: { label: 'Consulté', tone: 'accent', dot: 'bg-accent' },
  EXPIRE: { label: 'Expiré', tone: 'neutral', dot: 'bg-subtle' },
  ANNULE: { label: 'Annulé', tone: 'neutral', dot: 'bg-subtle' },
};

/**
 * Le dictionnaire est optionnel : sans lui, les libellés français par défaut
 * s'appliquent, ce qui garde le composant utilisable partout.
 */
export function QuoteStatusBadge({ status, t }: { status: QuoteStatus; t?: Dictionary }) {
  const config = QUOTE_STATUS[status];
  return (
    <Badge tone={config.tone}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
      {quoteStatusLabel(status, t)}
    </Badge>
  );
}

export function quoteStatusLabel(status: QuoteStatus, t: Dictionary = fr): string {
  return t.status[status] ?? QUOTE_STATUS[status].label;
}

const LEAD_STATUS: Record<
  LeadStatus,
  { label: string; tone: React.ComponentProps<typeof Badge>['tone'] }
> = {
  NOUVEAU: { label: 'Nouveau', tone: 'accent' },
  CONTACTE: { label: 'Contacté', tone: 'info' },
  QUALIFIE: { label: 'Qualifié', tone: 'info' },
  DEVIS_ENVOYE: { label: 'Devis envoyé', tone: 'outline' },
  RELANCE: { label: 'Relance', tone: 'warning' },
  GAGNE: { label: 'Gagné', tone: 'success' },
  PERDU: { label: 'Perdu', tone: 'neutral' },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = LEAD_STATUS[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS[status].label;
}
