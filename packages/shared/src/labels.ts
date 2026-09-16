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
  | 'ANNULE'
  | 'SIGNE'
  | 'FACTURE';

export const QUOTE_EVENT_LABELS: Record<QuoteEventTypeId, string> = {
  CREE: 'Créé',
  MODIFIE: 'Modifié',
  ENVOYE: 'Envoyé au client',
  CONSULTE: 'Ouvert par le client',
  ACCEPTE: 'Ouvert par le client',
  REFUSE: 'Ouvert par le client',
  MODIFICATION_DEMANDEE: 'Ouvert par le client',
  RELANCE: 'Relancé',
  PDF_TELECHARGE: 'PDF téléchargé',
  ANNULE: 'Annulé',
  SIGNE: 'Signé par le client',
  FACTURE: 'Facturé',
};

export type FollowUpTone = 'court' | 'professionnel' | 'amical' | 'ferme';

export const QUOTE_STATUS_LABELS: Record<QuoteStatusId, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  CONSULTE: 'Consulté',
  ACCEPTE: 'Consulté',
  REFUSE: 'Consulté',
  MODIFICATION_DEMANDEE: 'Consulté',
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


/** Rôles d'équipe — mêmes littéraux que l'enum Prisma `MemberRole`. */
export type MemberRoleId = 'OWNER' | 'ADMIN' | 'MEMBER' | 'COMPTABLE';

/** Statuts de facture — mêmes littéraux que l'enum Prisma `InvoiceStatus`. */
export type InvoiceStatusId =
  | 'BROUILLON'
  | 'ENVOYEE'
  | 'PARTIELLE'
  | 'PAYEE'
  | 'EN_RETARD'
  | 'ANNULEE';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatusId, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyée',
  PARTIELLE: 'Partiellement payée',
  PAYEE: 'Payée',
  EN_RETARD: 'En retard',
  ANNULEE: 'Annulée',
};

/** Cycle de vie d'un encaissement. */
export type PaymentStatusId = 'EN_ATTENTE' | 'REUSSI' | 'ECHOUE' | 'REMBOURSE';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusId, string> = {
  EN_ATTENTE: 'En attente',
  REUSSI: 'Reçu',
  ECHOUE: 'Échoué',
  REMBOURSE: 'Remboursé',
};

export type PaymentProviderId = 'MANUEL' | 'STRIPE';
export type PaymentMethodId = 'VIREMENT' | 'CARTE' | 'ESPECES' | 'CHEQUE' | 'AUTRE';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  VIREMENT: 'Virement',
  CARTE: 'Carte bancaire',
  ESPECES: 'Espèces',
  CHEQUE: 'Chèque',
  AUTRE: 'Autre',
};

/** Avancement de l'inscription Stripe Connect de l'entreprise. */
export type StripeAccountStatusId = 'ABSENT' | 'EN_COURS' | 'ACTIF' | 'RESTREINT';

/** Modèles de document proposés à l'artisan. */
export type DocumentTemplateId = 'MINIMAL' | 'MODERNE' | 'EXECUTIF';

export const DOCUMENT_TEMPLATE_LABELS: Record<DocumentTemplateId, { name: string; description: string }> = {
  MINIMAL: {
    name: 'Minimal',
    description: 'Noir et blanc, beaucoup d’air. Le document se lit d’un coup d’œil.',
  },
  MODERNE: {
    name: 'Moderne',
    description: 'Bandeau à votre couleur et totaux mis en avant. Le choix par défaut.',
  },
  EXECUTIF: {
    name: 'Exécutif',
    description: 'En-tête dense et filets fins, pour les dossiers les plus formels.',
  },
};

/** Postes de dépense. */
export type ExpenseCategoryId =
  | 'MATERIAUX'
  | 'OUTILLAGE'
  | 'CARBURANT'
  | 'VEHICULE'
  | 'SOUS_TRAITANCE'
  | 'ASSURANCE'
  | 'TELECOM'
  | 'LOYER'
  | 'FOURNITURES'
  | 'REPAS'
  | 'FORMATION'
  | 'TAXES'
  | 'AUTRE';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryId, string> = {
  MATERIAUX: 'Matériaux',
  OUTILLAGE: 'Outillage',
  CARBURANT: 'Carburant',
  VEHICULE: 'Véhicule',
  SOUS_TRAITANCE: 'Sous-traitance',
  ASSURANCE: 'Assurance',
  TELECOM: 'Téléphone et internet',
  LOYER: 'Loyer',
  FOURNITURES: 'Fournitures',
  REPAS: 'Repas',
  FORMATION: 'Formation',
  TAXES: 'Taxes et cotisations',
  AUTRE: 'Autre',
};

export const EXPENSE_CATEGORY_ORDER: ExpenseCategoryId[] = [
  'MATERIAUX', 'OUTILLAGE', 'CARBURANT', 'VEHICULE', 'SOUS_TRAITANCE',
  'FOURNITURES', 'ASSURANCE', 'TELECOM', 'LOYER', 'REPAS', 'FORMATION',
  'TAXES', 'AUTRE',
];
