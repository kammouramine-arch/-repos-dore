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
  it('never short-circuits a plan change on an existing entitlement, and keeps the customer on the screen when opened from Mon espace', () => {
    const purchases = readFileSync('mobile/src/lib/apple-purchases.ts', 'utf8');
    expect(purchases).toMatch(/if \(existing\.some\(purchase => purchase\.productId === productId\)\) \{[\s\S]{0,400}return 'reconciled' as const;/);
    expect(purchases).not.toMatch(/if \(existing\.length\) \{[\s\S]*return 'purchased'/);
    expect(paywall).toContain('const manage = router.canGoBack();');
    expect(paywall).toContain("if (appleActive && !wasActive.current && !manage) router.replace('/(app)');");
    expect(paywall).toContain("setResult({ kind: 'restored', plan: current.plan })");
    expect(paywall).toContain("setResult({ kind: 'downgrade', plan: current.plan, pending: intent.plan");
    const result = readFileSync('mobile/src/components/plan-action-result.tsx', 'utf8');
    expect(result).toContain('est maintenant actif');
    expect(result).toContain('reste actif');
    expect(result).toContain('prendra ensuite le relais');
    expect(result).toContain('Achats restaurés');
  });
  it('exposes build provenance in the app and a visible diagnostics entry in the diagnostics profile', () => {
    const config = readFileSync('mobile/app.config.ts', 'utf8');
    expect(config).toContain("buildProfile: process.env.EAS_BUILD_PROFILE ?? null");
    expect(config).toContain("commit: (process.env.EAS_BUILD_GIT_COMMIT_HASH ?? '').slice(0, 7) || null");
    expect(readFileSync('mobile/app/(app)/plus.tsx', 'utf8')).toContain('Constants.nativeBuildVersion');
    const report = readFileSync('mobile/src/components/diagnostic-report.tsx', 'utf8');
    expect(report).toContain("en ? 'StoreKit diagnostics' : 'Diagnostic StoreKit'");
    expect(report).toContain("en ? 'WRAPPER (expo-iap)' : 'BIBLIOTHÈQUE (expo-iap)'");
    expect(report).toContain("en ? 'DIRECT STOREKIT 2' : 'STOREKIT 2 DIRECT'");
    expect(report).toContain("if (!Constants.expoConfig?.extra?.storekitDiagnostics) return null;");
  });
  it('respects Reduce Motion', () => {
    expect(sheet).toContain('useReducedMotion');
    expect(sheet).toContain('if (reduced) { progress.setValue(1)');
  });
});
