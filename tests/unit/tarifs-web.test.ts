import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLANS, PLAN_ORDER, effectiveMonthlyPriceCents } from '../../packages/shared/src/plans';
import { formatCents } from '../../packages/shared/src/money';

/**
 * Le prix affiché sur le web est un engagement, pas une statistique.
 *
 * La page des tarifs formatait le montant en mode « compact », celui des
 * tuiles du tableau de bord, qui arrondit à l'euro : 29,99 € s'y écrivait
 * « 30 € ». Un chiffre d'affaires arrondi n'engage personne ; un tarif, si.
 */

describe('les tarifs du web s’affichent au centime', () => {
  it('n’arrondit plus le prix des formules', () => {
    const pricing = readFileSync('src/components/marketing/pricing.tsx', 'utf8');
    expect(pricing).toContain('{formatCents(effectiveMonthlyPriceCents(plan.id))}');
    expect(pricing).not.toContain('effectiveMonthlyPriceCents(plan.id), { compact: true }');
  });

  it('écrit bien les centimes du tarif de lancement', () => {
    expect(formatCents(effectiveMonthlyPriceCents('ESSENTIEL', true))).toContain('29,99');
    expect(formatCents(effectiveMonthlyPriceCents('PRO', true))).toContain('59,99');
    expect(formatCents(effectiveMonthlyPriceCents('ENTREPRISE', true))).toContain('99,99');
  });

  /*
   * Et le tarif en vigueur reste lisible tel quel : tant que Stripe n'a pas
   * été repricé, c'est lui qui doit s'afficher — annoncer 29,99 € en
   * prélevant 39 € serait pire que l'arrondi qu'on vient de corriger.
   */
  it('affiche le tarif en vigueur quand le lancement n’est pas actif', () => {
    expect(formatCents(effectiveMonthlyPriceCents('ESSENTIEL', false))).toContain('39,00');
    expect(formatCents(effectiveMonthlyPriceCents('PRO', false))).toContain('79,00');
    expect(formatCents(effectiveMonthlyPriceCents('ENTREPRISE', false))).toContain('149,00');
  });

  /*
   * Une seule source. Les montants ne doivent exister que dans `plans.ts` :
   * une page qui écrirait « 29,99 € » en dur finirait par diverger du
   * prélèvement réel.
   */
  it('ne code aucun tarif en dur dans les pages', () => {
    for (const file of ['src/components/marketing/pricing.tsx', 'src/app/(marketing)/tarifs/page.tsx']) {
      const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(source, file).not.toMatch(/\b(29|39|59|79|99|149)[,.]\d{2}\s*€/);
    }
    for (const plan of PLAN_ORDER) {
      expect(PLANS[plan].launchMonthlyPriceCents).toBeGreaterThan(0);
    }
  });
});
