import { describe, expect, it } from 'vitest';
import {
  ACTIVE_STATUSES,
  PLANS,
  TRIAL_DAYS,
  accessStateFor,
  daysUntil,
  planChange,
  trialMessage,
  type SubscriptionSnapshot,
} from '@devisia/shared';

const NOW = new Date('2026-03-10T12:00:00.000Z');

function snapshot(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    plan: 'ESSENTIEL',
    status: 'trialing',
    trialEndsAt: new Date('2026-03-15T12:00:00.000Z').toISOString(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe('essai gratuit', () => {
  it('dure 7 jours', () => {
    expect(TRIAL_DAYS).toBe(7);
  });

  it('compte les jours restants sans jamais passer sous zéro', () => {
    expect(daysUntil('2026-03-15T12:00:00.000Z', NOW)).toBe(5);
    expect(daysUntil('2026-03-09T12:00:00.000Z', NOW)).toBe(0);
    expect(daysUntil(null, NOW)).toBe(0);
    expect(daysUntil('date-invalide', NOW)).toBe(0);
  });

  it('laisse écrire pendant l’essai', () => {
    const state = accessStateFor(snapshot(), NOW);
    expect(state.canWrite).toBe(true);
    expect(state.inTrial).toBe(true);
    expect(state.trialDaysLeft).toBe(5);
  });

  it('ferme l’écriture à l’expiration, sans supprimer de données', () => {
    const state = accessStateFor(
      snapshot({ trialEndsAt: new Date('2026-03-09T12:00:00.000Z').toISOString() }),
      NOW,
    );
    expect(state.canWrite).toBe(false);
    expect(state.trialExpired).toBe(true);
    expect(state.reason).toMatch(/essai gratuit est terminé/i);
  });

  it('formule un message lisible', () => {
    expect(trialMessage(5)).toMatch(/5 jours/);
    expect(trialMessage(1)).toMatch(/demain/);
    expect(trialMessage(0)).toMatch(/terminé/);
  });
});

describe('états d’abonnement', () => {
  it('laisse travailler un abonnement actif', () => {
    const state = accessStateFor(snapshot({ status: 'active', trialEndsAt: null }), NOW);
    expect(state.canWrite).toBe(true);
    expect(state.inTrial).toBe(false);
    expect(state.reason).toBeNull();
  });

  it('laisse une chance en cas d’impayé, en le signalant', () => {
    const state = accessStateFor(snapshot({ status: 'past_due', trialEndsAt: null }), NOW);
    expect(state.canWrite).toBe(true);
    expect(state.paymentIssue).toBe(true);
    expect(state.reason).toMatch(/paiement/i);
  });

  it('bloque l’écriture après résiliation', () => {
    const state = accessStateFor(snapshot({ status: 'canceled', trialEndsAt: null }), NOW);
    expect(state.canWrite).toBe(false);
    expect(state.reason).toMatch(/résilié/i);
  });

  it('bloque un abonnement incomplet', () => {
    const state = accessStateFor(snapshot({ status: 'incomplete', trialEndsAt: null }), NOW);
    expect(state.canWrite).toBe(false);
    expect(state.paymentIssue).toBe(true);
  });

  it('refuse l’accès en l’absence d’abonnement', () => {
    const state = accessStateFor(null, NOW);
    expect(state.canWrite).toBe(false);
  });

  it('déclare les états ouverts', () => {
    expect(ACTIVE_STATUSES).toEqual(['trialing', 'active', 'past_due']);
  });
});

describe('formules', () => {
  it('applique les prix annoncés', () => {
    expect(PLANS.ESSENTIEL.monthlyPriceCents).toBe(3900);
    expect(PLANS.PRO.monthlyPriceCents).toBe(7900);
    expect(PLANS.ENTREPRISE.monthlyPriceCents).toBe(14900);
  });

  it('distingue montée et descente en gamme', () => {
    expect(planChange('ESSENTIEL', 'PRO')).toBe('upgrade');
    expect(planChange('ESSENTIEL', 'ENTREPRISE')).toBe('upgrade');
    expect(planChange('PRO', 'ENTREPRISE')).toBe('upgrade');
    expect(planChange('ENTREPRISE', 'PRO')).toBe('downgrade');
    expect(planChange('PRO', 'ESSENTIEL')).toBe('downgrade');
    expect(planChange('PRO', 'PRO')).toBe('same');
  });

  it('ouvre les fonctions d’équipe à partir de Pro', () => {
    expect(PLANS.ESSENTIEL.features.team).toBe(false);
    expect(PLANS.PRO.features.team).toBe(true);
    expect(PLANS.ENTREPRISE.features.integrations).toBe(true);
  });

  it('laisse la formule Entreprise sans limite d’IA', () => {
    expect(PLANS.ESSENTIEL.limits.aiGenerations).toBe(50);
    expect(PLANS.ENTREPRISE.limits.aiGenerations).toBeNull();
  });
});
