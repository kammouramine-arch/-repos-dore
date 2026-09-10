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
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  stripePriceEnvKey: 'STRIPE_PRICE_ESSENTIEL' | 'STRIPE_PRICE_PRO' | 'STRIPE_PRICE_ENTREPRISE';
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
  recommended?: boolean;
}

export const TRIAL_DAYS = 3;

export const PLANS: Record<PlanId, PlanDefinition> = {
  ESSENTIEL: {
    id: 'ESSENTIEL',
    name: 'Essentiel',
    tagline: 'Pour l’artisan indépendant qui veut arrêter de perdre des devis.',
    monthlyPriceCents: 3900,
    yearlyPriceCents: 39000,
    stripePriceEnvKey: 'STRIPE_PRICE_ESSENTIEL',
    limits: { aiGenerations: 50, aiTranscriptions: 50, aiImageAnalyses: 25, followUps: 100, quotesSent: 100, seats: 1 },
    features: {
      automations: false,
      team: false,
      advancedAnalytics: true,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: false,
      whiteLabel: false,
    },
    highlights: [
      'Devis par IA : voix, photo ou texte (50 générations/mois)',
      'Catalogue de prix illimité',
      'PDF professionnel à votre image',
      'Page de devis en ligne, prête à partager',
      'Relances suggérées, envoyées en un clic',
      '1 utilisateur',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    tagline: 'Pour les entreprises qui veulent automatiser leur suivi commercial.',
    monthlyPriceCents: 7900,
    yearlyPriceCents: 79000,
    stripePriceEnvKey: 'STRIPE_PRICE_PRO',
    limits: { aiGenerations: 300, aiTranscriptions: 300, aiImageAnalyses: 150, followUps: 1000, quotesSent: null, seats: 3 },
    features: {
      automations: true,
      team: true,
      advancedAnalytics: true,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: true,
      whiteLabel: false,
    },
    highlights: [
      'Tout Essentiel, jusqu’à 300 générations IA par mois',
      'Séquences de relance automatiques',
      'Historique complet de vos devis',
      'Assistant IA sur vos données',
      'Équipe de 3 utilisateurs',
      'Support prioritaire',
    ],
    recommended: true,
  },
  ENTREPRISE: {
    id: 'ENTREPRISE',
    name: 'Entreprise',
    tagline: 'Pour les équipes et les entreprises multi-intervenants.',
    monthlyPriceCents: 14900,
    yearlyPriceCents: 149000,
    stripePriceEnvKey: 'STRIPE_PRICE_ENTREPRISE',
    limits: { aiGenerations: 1000, aiTranscriptions: 1000, aiImageAnalyses: 500, followUps: null, quotesSent: null, seats: 10 },
    features: {
      automations: true,
      team: true,
      advancedAnalytics: true,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: true,
      whiteLabel: false,
    },
    highlights: [
      'Tout Pro, jusqu’à 1 000 générations IA par mois',
      'Analytique et objectifs commerciaux',
      'Équipe jusqu’à 10 utilisateurs',
      'Accompagnement à la mise en route',
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ['ESSENTIEL', 'PRO', 'ENTREPRISE'];

export function getPlan(plan: PlanId): PlanDefinition {
  return PLANS[plan];
}

/** Une formule couvre-t-elle une fonctionnalité ? */
export function planHasFeature(plan: PlanId, feature: keyof PlanFeatures): boolean {
  return PLANS[plan].features[feature];
}

