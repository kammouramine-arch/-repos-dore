/** Libellés métier partagés entre le web et le mobile. */

export type QuoteStatusId =
  | 'BROUILLON'
  | 'ENVOYE'
  | 'CONSULTE'
  | 'ACCEPTE'
  | 'REFUSE'
  | 'MODIFICATION_DEMANDEE'
  | 'EXPIRE'
  | 'ANNULE';

export type LeadStatusId =
  | 'NOUVEAU'
  | 'CONTACTE'
  | 'QUALIFIE'
  | 'DEVIS_ENVOYE'
  | 'RELANCE'
  | 'GAGNE'
  | 'PERDU';

export type QuoteItemKindId =
  | 'MATERIAU'
  | 'MAIN_OEUVRE'
  | 'SERVICE'
  | 'PACK'
  | 'FRAIS'
  | 'REMISE';

export type FollowUpTone = 'court' | 'professionnel' | 'amical' | 'ferme';

export const QUOTE_STATUS_LABELS: Record<QuoteStatusId, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  CONSULTE: 'Consulté',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  MODIFICATION_DEMANDEE: 'Modification demandée',
  EXPIRE: 'Expiré',
  ANNULE: 'Annulé',
};

export const LEAD_STATUS_LABELS: Record<LeadStatusId, string> = {
  NOUVEAU: 'Nouveau',
  CONTACTE: 'Contacté',
  QUALIFIE: 'Qualifié',
  DEVIS_ENVOYE: 'Devis envoyé',
  RELANCE: 'Relance',
  GAGNE: 'Gagné',
  PERDU: 'Perdu',
};

export const QUOTE_ITEM_KIND_LABELS: Record<QuoteItemKindId, string> = {
  MATERIAU: 'Matériau',
  MAIN_OEUVRE: 'Main-d’œuvre',
  SERVICE: 'Prestation',
  PACK: 'Forfait',
  FRAIS: 'Frais',
  REMISE: 'Remise',
};

export const FOLLOW_UP_TONE_LABELS: Record<FollowUpTone, string> = {
  court: 'Court',
  professionnel: 'Professionnel',
  amical: 'Amical',
  ferme: 'Ferme',
};

export const FOLLOW_UP_TONE_HINTS: Record<FollowUpTone, string> = {
  court: 'Trois phrases, droit au but.',
  professionnel: 'Ton neutre et posé, adapté aux entreprises.',
  amical: 'Ton chaleureux, adapté aux particuliers fidèles.',
  ferme: 'Dernier rappel courtois avant classement sans suite.',
};
