import { PLANS, type PlanFeatures, type PlanId, type PlanLimits, type SubscriptionStatusId } from './plans';

/**
 * Droits d'accès selon la formule et l'état de l'abonnement.
 *
 * Une seule source de vérité, partagée par le serveur (qui applique), le web et
 * le mobile (qui affichent). Le client n'accorde jamais un droit : il reflète
 * ce que le serveur a déjà décidé.
 */

/** États permettant d'utiliser l'application. */
export const ACTIVE_STATUSES: SubscriptionStatusId[] = ['trialing', 'active', 'past_due'];

/** États bloquants : l'utilisateur doit choisir une formule pour continuer. */
export const BLOCKED_STATUSES: SubscriptionStatusId[] = ['canceled', 'incomplete'];

export interface SubscriptionSnapshot {
  provider?: 'apple' | 'stripe' | 'trial';
  plan: PlanId;
  status: SubscriptionStatusId;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AccessState {
  /** L'utilisateur peut-il créer et envoyer des devis ? */
  canWrite: boolean;
  /** L'essai est-il en cours ? */
  inTrial: boolean;
  /** Jours restants d'essai (0 si terminé ou hors essai). */
  trialDaysLeft: number;
  /** L'essai vient-il d'expirer sans abonnement ? */
  trialExpired: boolean;
  /** Un paiement a-t-il échoué ? */
  paymentIssue: boolean;
  /** Motif lisible du blocage, le cas échéant. */
  reason: string | null;
}

/** Nombre de jours entiers restants avant une échéance. */
export function daysUntil(date: string | Date | null | undefined, now = new Date()): number {
  if (!date) return 0;
  const target = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(target.getTime())) return 0;
  const diff = target.getTime() - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * État d'accès calculé à partir de l'abonnement.
 * L'essai expiré n'efface rien : il ferme l'écriture et ouvre la page d'abonnement.
 */
export function accessStateFor(
  subscription: SubscriptionSnapshot | null,
  now = new Date(),
): AccessState {
  if (!subscription) {
    return {
      canWrite: false,
      inTrial: false,
      trialDaysLeft: 0,
      trialExpired: false,
      paymentIssue: false,
      reason: 'Aucun abonnement associé à cette entreprise.',
    };
  }

  const trialDaysLeft = daysUntil(subscription.trialEndsAt, now);
  if (subscription.provider === 'apple' && (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() <= now.getTime())) {
    return { canWrite: false, inTrial: false, trialDaysLeft: 0, trialExpired: subscription.status === 'trialing', paymentIssue: false, reason: 'Votre abonnement Apple doit être renouvelé ou restauré pour continuer.' };
  }
  const trialing = subscription.status === 'trialing';
  const trialExpired = trialing && trialDaysLeft === 0;

  if (trialExpired) {
    return {
      canWrite: false,
      inTrial: false,
      trialDaysLeft: 0,
      trialExpired: true,
      paymentIssue: false,
      reason: 'Votre essai gratuit est terminé. Choisissez une formule pour continuer.',
    };
  }

  if (subscription.status === 'past_due') {
    return {
      canWrite: true,
      inTrial: false,
      trialDaysLeft: 0,
      trialExpired: false,
      paymentIssue: true,
      reason: "Votre dernier paiement n'a pas abouti. Mettez à jour votre moyen de paiement.",
    };
  }

  if (!ACTIVE_STATUSES.includes(subscription.status)) {
    return {
      canWrite: false,
      inTrial: false,
      trialDaysLeft: 0,
      trialExpired: false,
      paymentIssue: subscription.status === 'incomplete',
      reason:
        subscription.status === 'canceled'
          ? 'Votre abonnement est résilié. Réactivez-le pour continuer à créer des devis.'
          : "Votre abonnement n'est pas encore actif.",
    };
  }

  return {
    canWrite: true,
    inTrial: trialing,
    trialDaysLeft: trialing ? trialDaysLeft : 0,
    trialExpired: false,
    paymentIssue: false,
    reason: null,
  };
}

export function limitsFor(plan: PlanId): PlanLimits {
  return PLANS[plan].limits;
}

export function featuresFor(plan: PlanId): PlanFeatures {
  return PLANS[plan].features;
}

/** Message d'essai affiché dans la bannière web et mobile. */
export function trialMessage(daysLeft: number): string {
  if (daysLeft <= 0) return 'Votre essai gratuit est terminé.';
  if (daysLeft === 1) return "Votre essai gratuit se termine demain.";
  return `Votre essai gratuit se termine dans ${daysLeft} jours.`;
}

/** Comparaison de formules pour distinguer montée et descente en gamme. */
const RANK: Record<PlanId, number> = { ESSENTIEL: 1, PRO: 2, ENTREPRISE: 3 };

export type PlanChange = 'upgrade' | 'downgrade' | 'same';

export function planChange(from: PlanId, to: PlanId): PlanChange {
  if (RANK[to] > RANK[from]) return 'upgrade';
  if (RANK[to] < RANK[from]) return 'downgrade';
  return 'same';
}
