/**
 * Catégories de notifications, du point de vue de l'artisan.
 *
 * ## Une règle : aucun interrupteur qui ne commande rien
 *
 * La tentation, en écrivant un écran de réglages, est de lister tout ce qu'on
 * pourrait un jour notifier. On obtient une page rassurante et des cases qui
 * ne servent à rien — et le jour où l'artisan en décoche une pour ne plus
 * être dérangé, il l'est quand même. Chaque catégorie ci-dessous correspond à
 * des notifications réellement émises par le serveur, et la table de
 * correspondance est vérifiée par un test.
 *
 * ## Ce que couper une catégorie fait, et ne fait pas
 *
 * Couper une catégorie arrête la notification poussée sur l'iPhone. La trace
 * reste dans l'activité de l'application : c'est un journal, pas une
 * interruption, et un artisan qui a coupé les alertes de consultation veut
 * quand même pouvoir vérifier qui a ouvert son devis.
 */

export const NOTIFICATION_CATEGORIES = [
  'quoteViewed',
  'quoteAnswered',
  'followUps',
  'paymentReceived',
  'invoiceOverdue',
  'leads',
  'account',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * Le type de notification émis par le serveur → la catégorie que l'artisan
 * voit dans ses réglages.
 *
 * Les types absents de cette table ne sont pas filtrables : ils passent
 * toujours. Aujourd'hui il n'y en a pas, et le test le vérifie.
 */
export const NOTIFICATION_CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  DEVIS_CONSULTE: 'quoteViewed',
  DEVIS_ACCEPTE: 'quoteAnswered',
  DEVIS_REFUSE: 'quoteAnswered',
  DEVIS_MODIFICATION: 'quoteAnswered',
  DEVIS_ENVOYE: 'quoteAnswered',
  RELANCE_A_FAIRE: 'followUps',
  RELANCE_ENVOYEE: 'followUps',
  FACTURE_PAYEE: 'paymentReceived',
  FACTURE_EN_RETARD: 'invoiceOverdue',
  NOUVEAU_PROSPECT: 'leads',
  ABONNEMENT: 'account',
  SYSTEME: 'account',
};

export function categoryForNotificationType(type: string): NotificationCategory | null {
  return NOTIFICATION_CATEGORY_BY_TYPE[type] ?? null;
}

/** Tout est allumé par défaut : on ne fait pas manquer une acceptation à quelqu'un qui n'a rien réglé. */
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationCategory, boolean> = {
  quoteViewed: true,
  quoteAnswered: true,
  followUps: true,
  paymentReceived: true,
  invoiceOverdue: true,
  leads: true,
  account: true,
};

export interface NotificationCategoryLabel {
  title: { fr: string; en: string };
  body: { fr: string; en: string };
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, NotificationCategoryLabel> = {
  quoteViewed: {
    title: { fr: 'Devis consulté', en: 'Quote opened' },
    body: { fr: 'Votre client vient d’ouvrir un devis', en: 'Your client has just opened a quote' },
  },
  quoteAnswered: {
    title: { fr: 'Réponse à un devis', en: 'Quote answered' },
    body: { fr: 'Accepté, refusé ou modification demandée', en: 'Accepted, declined or changes requested' },
  },
  followUps: {
    title: { fr: 'Relances', en: 'Follow-ups' },
    body: { fr: 'Un devis sans réponse attend une relance', en: 'A quote with no reply is due a follow-up' },
  },
  paymentReceived: {
    title: { fr: 'Paiement reçu', en: 'Payment received' },
    body: { fr: 'Une facture vient d’être réglée', en: 'An invoice has just been settled' },
  },
  invoiceOverdue: {
    title: { fr: 'Facture en retard', en: 'Invoice overdue' },
    body: { fr: 'L’échéance est passée et le solde reste dû', en: 'The due date has passed and a balance remains' },
  },
  leads: {
    title: { fr: 'Nouvelle demande', en: 'New enquiry' },
    body: { fr: 'Quelqu’un vous a contacté depuis votre page', en: 'Someone contacted you from your page' },
  },
  account: {
    title: { fr: 'Compte et abonnement', en: 'Account & subscription' },
    body: { fr: 'Essai, renouvellement, incident de paiement', en: 'Trial, renewal, payment problem' },
  },
};

/** Normalise ce qui est stocké : une valeur inconnue ou absente vaut « allumé ». */
export function readNotificationPreferences(stored: unknown): Record<NotificationCategory, boolean> {
  const source = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const category of NOTIFICATION_CATEGORIES) {
    if (source[category] === false) result[category] = false;
  }
  return result;
}
