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

/**
 * Catégories du catalogue de prix.
 *
 * Distinctes des natures de ligne de devis : le catalogue n'accepte ni frais ni
 * remise. Les confondre laissait passer des valeurs refusées par la base — un
 * écran mobile pouvait proposer une catégorie que l'API rejetait en 422.
 */
export type PriceBookCategoryId = 'MATERIAU' | 'MAIN_OEUVRE' | 'SERVICE' | 'PACK';

export const PRICE_BOOK_CATEGORY_LABELS: Record<PriceBookCategoryId, string> = {
  MAIN_OEUVRE: 'Main-d’œuvre',
  MATERIAU: 'Matériau',
  SERVICE: 'Prestation',
  PACK: 'Forfait',
};

/** Ordre d'affichage : ce qu'un artisan saisit le plus souvent d'abord. */
export const PRICE_BOOK_CATEGORIES: PriceBookCategoryId[] = [
  'MAIN_OEUVRE',
  'MATERIAU',
  'SERVICE',
  'PACK',
];

/** Ce qui est arrivé à un devis, dit du point de vue de l'artisan. */
export type QuoteEventTypeId =
  | 'CREE'
  | 'MODIFIE'
  | 'ENVOYE'
  | 'CONSULTE'
  | 'ACCEPTE'
  | 'REFUSE'
  | 'MODIFICATION_DEMANDEE'
  | 'RELANCE'
  | 'PDF_TELECHARGE'
  | 'ANNULE';

export const QUOTE_EVENT_LABELS: Record<QuoteEventTypeId, string> = {
  CREE: 'Créé',
  MODIFIE: 'Modifié',
  ENVOYE: 'Envoyé au client',
  CONSULTE: 'Ouvert par le client',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  MODIFICATION_DEMANDEE: 'Modification demandée',
  RELANCE: 'Relancé',
  PDF_TELECHARGE: 'PDF téléchargé',
  ANNULE: 'Annulé',
};

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
