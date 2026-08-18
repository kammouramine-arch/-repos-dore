/**
 * Configuration centrale des formules DEVISIA.
 * Aucun prix ni aucune limite ne doit être écrit ailleurs dans le code.
 */
import type { SubscriptionPlan } from '@prisma/client';

export interface PlanLimits {
  /** Générations IA de devis incluses par mois (null = illimité). */
  aiGenerations: number | null;
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
  id: SubscriptionPlan;
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

export const TRIAL_DAYS = 14;

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  ESSENTIEL: {
    id: 'ESSENTIEL',
    name: 'Essentiel',
    tagline: 'Pour l’artisan indépendant qui veut arrêter de perdre des devis.',
    monthlyPriceCents: 3900,
    yearlyPriceCents: 39000,
    stripePriceEnvKey: 'STRIPE_PRICE_ESSENTIEL',
    limits: { aiGenerations: 50, followUps: 100, quotesSent: 100, seats: 1 },
    features: {
      automations: false,
      team: false,
      advancedAnalytics: false,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: false,
      whiteLabel: false,
    },
    highlights: [
      'Devis par IA : voix, photo ou texte',
      'Catalogue de prix illimité',
      'PDF professionnel à votre image',
      'Page de devis en ligne et acceptation client',
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
    limits: { aiGenerations: 300, followUps: 1000, quotesSent: null, seats: 3 },
    features: {
      automations: true,
      team: true,
      advancedAnalytics: false,
      integrations: false,
      publicLeadForm: true,
      prioritySupport: true,
      whiteLabel: false,
    },
    highlights: [
      'Tout Essentiel, sans limite de devis',
      'Séquences de relance automatiques',
      'Formulaire de demande de devis pour votre site',
      'Assistant IA sur vos données',
      'Jusqu’à 3 utilisateurs',
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
    limits: { aiGenerations: null, followUps: null, quotesSent: null, seats: 10 },
    features: {
      automations: true,
      team: true,
      advancedAnalytics: true,
      integrations: true,
      publicLeadForm: true,
      prioritySupport: true,
      whiteLabel: false,
    },
    highlights: [
      'Tout Pro, sans limite d’IA',
      'Gestion d’équipe et rôles avancés',
      'Analytique avancée et objectifs',
      'Intégrations (comptabilité, agenda, automatisation)',
      'Jusqu’à 10 utilisateurs',
      'Accompagnement à la mise en route',
    ],
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = ['ESSENTIEL', 'PRO', 'ENTREPRISE'];

export function getPlan(plan: SubscriptionPlan): PlanDefinition {
  return PLANS[plan];
}

/** Une formule couvre-t-elle une fonctionnalité ? */
export function planHasFeature(plan: SubscriptionPlan, feature: keyof PlanFeatures): boolean {
  return PLANS[plan].features[feature];
}

/** Statuts pour lesquels l'accès applicatif reste ouvert. */
export const ACTIVE_STATUSES = ['trialing', 'active', 'past_due'] as const;
