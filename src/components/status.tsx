import * as React from 'react';
import type { LeadStatus, QuoteStatus } from '@prisma/client';
import { Badge } from './ui/badge';

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
  ACCEPTE: { label: 'Accepté', tone: 'success', dot: 'bg-success' },
  REFUSE: { label: 'Refusé', tone: 'danger', dot: 'bg-danger' },
  MODIFICATION_DEMANDEE: { label: 'Modification demandée', tone: 'warning', dot: 'bg-warning' },
  EXPIRE: { label: 'Expiré', tone: 'neutral', dot: 'bg-subtle' },
  ANNULE: { label: 'Annulé', tone: 'neutral', dot: 'bg-subtle' },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = QUOTE_STATUS[status];
  return (
    <Badge tone={config.tone}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
      {config.label}
    </Badge>
  );
}

export function quoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS[status].label;
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
