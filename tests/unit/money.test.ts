import { describe, expect, it } from 'vitest';
import {
  allocateProportionally,
  applyRate,
  centsToEuros,
  computeLine,
  computeQuoteTotals,
  eurosToCents,
  formatCents,
  roundHalfUp,
} from '@/lib/money';

describe('conversions monétaires', () => {
  it('convertit des euros en centimes sans dérive flottante', () => {
    expect(eurosToCents(19.99)).toBe(1999);
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
    expect(eurosToCents('1 234,56')).toBe(123456);
    expect(eurosToCents('abc')).toBe(0);
  });

  it('arrondit au centime le plus proche, 0,5 vers le haut', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(2.4)).toBe(2);
  });

  it('applique un pourcentage de façon déterministe', () => {
    expect(applyRate(10_000, 20)).toBe(2000);
    expect(applyRate(3333, 5.5)).toBe(183);
    expect(applyRate(1, 50)).toBe(1); // 0,5 centime arrondi au supérieur
  });

  it('formate en euros français', () => {
    expect(formatCents(485_000).replace(/ | /g, ' ')).toBe('4 850,00 €');
    expect(centsToEuros(1999)).toBe(19.99);
  });
});

describe('calcul de ligne', () => {
  it('calcule quantité × prix unitaire avec des quantités décimales', () => {
    const line = computeLine({ quantity: 1.5, unitPriceCents: 5500, vatRate: 10 });
    expect(line.grossCents).toBe(8250);
    expect(line.lineTotalCents).toBe(8250);
    expect(line.vatCents).toBe(825);
    expect(line.totalWithVatCents).toBe(9075);
  });

  it('applique la remise de ligne avant la TVA', () => {
    const line = computeLine({ quantity: 2, unitPriceCents: 10_000, discountRate: 10, vatRate: 20 });
    expect(line.discountCents).toBe(2000);
    expect(line.lineTotalCents).toBe(18_000);
    expect(line.vatCents).toBe(3600);
  });

  it('calcule la marge quand le prix d’achat est connu', () => {
    const line = computeLine({ quantity: 1, unitPriceCents: 95_000, costPriceCents: 65_000, vatRate: 10 });
    expect(line.marginCents).toBe(30_000);
    expect(line.marginRate).toBeCloseTo(31.58, 1);
  });

  it('ignore une quantité invalide plutôt que de produire NaN', () => {
    const line = computeLine({ quantity: Number.NaN, unitPriceCents: 1000, vatRate: 20 });
    expect(line.lineTotalCents).toBe(0);
  });
});

describe('totaux de devis', () => {
  it('ventile la TVA par taux et boucle exactement', () => {
    const totals = computeQuoteTotals({
      lines: [
        { quantity: 1, unitPriceCents: 100_000, vatRate: 10 },
        { quantity: 2, unitPriceCents: 25_000, vatRate: 20 },
      ],
    });

    expect(totals.subtotalCents).toBe(150_000);
    expect(totals.vatBreakdown).toHaveLength(2);
    const sumOfVat = totals.vatBreakdown.reduce((acc, bucket) => acc + bucket.vatCents, 0);
    expect(sumOfVat).toBe(totals.vatCents);
    expect(totals.totalCents).toBe(totals.netSubtotalCents + totals.vatCents);
  });

  it('répartit la remise globale sans perdre un centime', () => {
    const totals = computeQuoteTotals({
      lines: [
        { quantity: 1, unitPriceCents: 3333, vatRate: 20 },
        { quantity: 1, unitPriceCents: 3333, vatRate: 10 },
        { quantity: 1, unitPriceCents: 3334, vatRate: 5.5 },
      ],
      globalDiscountRate: 7,
    });

    const baseSum = totals.vatBreakdown.reduce((acc, bucket) => acc + bucket.baseCents, 0);
    expect(baseSum).toBe(totals.netSubtotalCents);
    expect(totals.discountCents).toBe(700);
  });

  it('annule la TVA en franchise en base', () => {
    const totals = computeQuoteTotals({
      lines: [{ quantity: 1, unitPriceCents: 100_000, vatRate: 20 }],
      vatExempt: true,
    });
    expect(totals.vatCents).toBe(0);
    expect(totals.totalCents).toBe(100_000);
  });

  it('calcule l’acompte sur le total TTC', () => {
    const totals = computeQuoteTotals({
      lines: [{ quantity: 1, unitPriceCents: 100_000, vatRate: 10 }],
      depositRate: 30,
    });
    expect(totals.totalCents).toBe(110_000);
    expect(totals.depositCents).toBe(33_000);
  });

  it('gère un devis vide', () => {
    const totals = computeQuoteTotals({ lines: [] });
    expect(totals.totalCents).toBe(0);
    expect(totals.vatBreakdown).toHaveLength(0);
  });
});

describe('répartition proportionnelle', () => {
  it('conserve la somme exacte malgré les arrondis', () => {
    const parts = allocateProportionally(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });

  it('renvoie des zéros quand il n’y a rien à répartir', () => {
    expect(allocateProportionally(0, [5, 5])).toEqual([0, 0]);
    expect(allocateProportionally(50, [0, 0])).toEqual([0, 0]);
  });
});
