import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Garde-fous de la confirmation de rétrogradation et de l'affichage du
 * changement en attente. Le rendu natif n'est pas testable ici ; le contrat
 * textuel et la logique de déclenchement le sont.
 */
describe('Apple downgrade confirmation', () => {
  const sheet = readFileSync('mobile/src/components/plan-change-sheet.tsx', 'utf8');
  const paywall = readFileSync('mobile/src/components/apple-paywall.tsx', 'utf8');
  it('is a DEVISERA sheet, not a system alert, with Continue/Cancel in both languages', () => {
    expect(sheet).not.toContain('Alert.alert');
    expect(sheet).toContain('<Modal');
    expect(sheet).toContain("en ? 'Continue' : 'Continuer'");
    expect(sheet).toContain("en ? 'Cancel' : 'Annuler'");
    expect(sheet).toContain('Passer à ${next} ?');
    expect(sheet).toContain('reste actif jusqu’à la fin de votre période en cours');
    expect(sheet).toContain('commence au prochain renouvellement');
    expect(sheet).toContain('Rien n’est perdu aujourd’hui');
  });
  it('opens only for an active Apple subscriber choosing a lower plan, before any StoreKit call', () => {
    expect(paywall).toContain("if (change === 'downgrade') { setConfirmingDowngrade(true); return; }");
    expect(paywall).toContain("const change = appleActive && selected ? planChange(subscription.plan, selected) : null;");
    expect(paywall).toContain("onConfirm={() => { setConfirmingDowngrade(false); void purchase(); }}");
  });
  it('shows the current plan with the pending plan and its date, never an invented entitlement', () => {
    expect(sheet).toContain('actif · ${PLANS[pending].name} à partir du ${date');
    expect(paywall).toContain('<PendingPlanNotice current={subscription.plan} pending={pendingPlan} date={pendingDate} en={en} />');
    expect(paywall).toContain("const pendingPlan = appleActive ? subscription.pendingPlan ?? null : null;");
    expect(paywall).not.toMatch(/plan:\s*pendingPlan/);
  });
  it('respects Reduce Motion', () => {
    expect(sheet).toContain('useReducedMotion');
    expect(sheet).toContain('if (reduced) { progress.setValue(1)');
  });
});
