/**
 * Configuration centrale des formules DEVISERA.
 * Aucun prix ni aucune limite ne doit être écrit ailleurs dans le code.
 */
/** Identifiants de formule — mêmes littéraux que l'enum Prisma `PlanId`. */
export type PlanId = 'ESSENTIEL' | 'PRO' | 'ENTREPRISE';

/** Statuts d'abonnement — mêmes littéraux que l'enum Prisma `SubscriptionStatus`. */
export type SubscriptionStatusId =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export interface PlanLimits {
  /** Générations IA de devis incluses par mois (null = illimité). */
  aiGenerations: number | null;
  /** Transcriptions audio serveur incluses par mois (null = illimité). */
  aiTranscriptions: number | null;
  /** Analyses photo IA incluses par mois (null = illimité). */
  aiImageAnalyses: number | null;
  /** Justificatifs lus par l'IA par mois (null = illimité). */
  receiptScans: number | null;
  /** Relances envoyées par mois (null = illimité). */
  followUps: number | null;
  /** Devis envoyés par mois (null = illimité). */
  quotesSent: number | null;
  /** Nombre d'utilisateurs inclus. */
  seats: number;
}

export interface PlanFeatures {
  automations: boolean;
  team: boolean;
  advancedAnalytics: boolean;
  integrations: boolean;
  publicLeadForm: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
  /** Encaissement en ligne des factures par le client de l'artisan (Stripe). */
  clientPayments: boolean;
  /** Lecture IA des justificatifs et suivi des dépenses. */
  receiptScanning: boolean;
  /** Exports datés pour le comptable et accès comptable en lecture. */
  accountantExport: boolean;
  /** Modèles de document Moderne et Exécutif, couleur et pied de page libres. */
  advancedBranding: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  /**
   * Tarif de lancement visé, en centimes.
   *
   * Ce montant ne s'affiche que lorsque les produits App Store Connect et les
   * prix Stripe portent réellement ce tarif : voir `LAUNCH_PRICING_LIVE` et
   * `effectiveMonthlyPriceCents`. Sur iPhone, StoreKit reste de toute façon
   * l'autorité : la feuille d'achat Apple affiche son propre prix.
   */
  launchMonthlyPriceCents: number;
  /** Tarif effectivement facturé aujourd'hui, en centimes. */
  legacyMonthlyPriceCents: number;
  yearlyPriceCents: number;
  stripePriceEnvKey: 'STRIPE_PRICE_ESSENTIEL' | 'STRIPE_PRICE_PRO' | 'STRIPE_PRICE_ENTREPRISE';
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
  recommended?: boolean;
}

/**
 * Durée de l'essai offert par DEVISERA sur le web, en jours.
 *
 * Sur iPhone, l'essai n'est jamais décidé ici : il provient de l'offre
 * d'introduction déclarée dans App Store Connect et lue dans les métadonnées
 * StoreKit. Le paywall iOS n'annonce un essai que si Apple le confirme.
 */
export const TRIAL_DAYS = 7;

/**
 * Le tarif de lancement est-il appliqué chez Apple et chez Stripe ?
 *
 * Tant que ce drapeau est faux, l'application affiche le tarif réellement
 * facturé. Le basculer avant d'avoir modifié les produits reviendrait à
 * annoncer un prix que nous ne pratiquons pas — donc à tromper le client et à
 * risquer un refus App Store. La procédure exacte est décrite dans
 * `docs/handoff/TARIFS_LANCEMENT.md`.
 */
export const LAUNCH_PRICING_LIVE: boolean =
  (typeof process !== 'undefined' &&
    (process.env?.NEXT_PUBLIC_LAUNCH_PRICING === '1' ||
      process.env?.EXPO_PUBLIC_LAUNCH_PRICING === '1')) ||
  false;

export const PLANS: Record<PlanId, PlanDefinition> = {
  ESSENTIEL: {
    id: 'ESSENTIEL',
    name: 'Essentiel',
    tagline: 'Pour l’artisan seul : parler, chiffrer, faire signer.',
    launchMonthlyPriceCents: 2999,
    legacyMonthlyPriceCents: 3900,
    yearlyPriceCents: 39000,
    stripePriceEnvKey: 'STRIPE_PRICE_ESSENTIEL',
    limits: {
      aiGenerations: 50,
      aiTranscriptions: 50,
      aiImageAnalyses: 25,
      receiptScans: 0,
      followUps: 100,
      quotesSent: 100,
      seats: 1,
    },
    features: {
      automations: false,
      team: false,
      advancedAnalytics: true,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: false,
      whiteLabel: false,
      clientPayments: false,
      receiptScanning: false,
      accountantExport: false,
      advancedBranding: false,
    },
    highlights: [
      'Devis à la voix : décrivez le chantier, l’IA structure (50 par mois)',
      'Signature du client sur place, sur votre téléphone',
      'Facture créée depuis le devis accepté',
      'PDF professionnel avec votre logo',
      'Catalogue de prix et clients illimités',
      '1 utilisateur',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    tagline: 'Pour être payé plus vite et garder ses comptes en ordre.',
    launchMonthlyPriceCents: 5999,
    legacyMonthlyPriceCents: 7900,
    yearlyPriceCents: 79000,
    stripePriceEnvKey: 'STRIPE_PRICE_PRO',
    limits: {
      aiGenerations: 300,
      aiTranscriptions: 300,
      aiImageAnalyses: 150,
      receiptScans: 200,
      followUps: 1000,
      quotesSent: null,
      seats: 3,
    },
    features: {
      automations: true,
      team: true,
      advancedAnalytics: true,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: true,
      whiteLabel: false,
      clientPayments: true,
      receiptScanning: true,
      accountantExport: true,
      advancedBranding: true,
    },
    highlights: [
      'Tout Essentiel, avec 300 devis à la voix par mois',
      'Paiement en ligne de vos factures par carte',
      'Scan des reçus : marchand, date, montant, TVA',
      'Export comptable daté, prêt à envoyer',
      'Modèles de document Moderne et Exécutif',
      'Relances automatiques · 3 utilisateurs',
    ],
    recommended: true,
  },
  ENTREPRISE: {
    id: 'ENTREPRISE',
    name: 'Entreprise',
    tagline: 'Pour les équipes : plusieurs intervenants, un seul atelier.',
    launchMonthlyPriceCents: 9999,
    legacyMonthlyPriceCents: 14900,
    yearlyPriceCents: 149000,
    stripePriceEnvKey: 'STRIPE_PRICE_ENTREPRISE',
    limits: {
      aiGenerations: 1000,
      aiTranscriptions: 1000,
      aiImageAnalyses: 500,
      receiptScans: null,
      followUps: null,
      quotesSent: null,
      seats: 10,
    },
    features: {
      automations: true,
      team: true,
      advancedAnalytics: true,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: true,
      whiteLabel: false,
      clientPayments: true,
      receiptScanning: true,
      accountantExport: true,
      advancedBranding: true,
    },
    highlights: [
      'Tout Pro, avec 1 000 devis à la voix par mois',
      'Jusqu’à 10 utilisateurs avec rôles séparés',
      'Accès comptable en lecture seule',
      'Justificatifs et relances sans limite',
      'Analytique et objectifs commerciaux',
      'Accompagnement à la mise en route',
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ['ESSENTIEL', 'PRO', 'ENTREPRISE'];

export function getPlan(plan: PlanId): PlanDefinition {
  return PLANS[plan];
}

/**
 * Tarif mensuel à afficher, en centimes.
 *
 * Renvoie le tarif de lancement seulement lorsqu'il est réellement appliqué
 * chez Apple et Stripe ; sinon le tarif en vigueur.
 */
export function effectiveMonthlyPriceCents(plan: PlanId, launchLive = LAUNCH_PRICING_LIVE): number {
  const definition = PLANS[plan];
  return launchLive ? definition.launchMonthlyPriceCents : definition.legacyMonthlyPriceCents;
}

/** Une formule couvre-t-elle une fonctionnalité ? */
export function planHasFeature(plan: PlanId, feature: keyof PlanFeatures): boolean {
  return PLANS[plan].features[feature];
}

/** Première formule ouvrant une fonctionnalité — sert à dire « à partir de Pro ». */
export function firstPlanWithFeature(feature: keyof PlanFeatures): PlanId | null {
  return PLAN_ORDER.find((plan) => PLANS[plan].features[feature]) ?? null;
}
