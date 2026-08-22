/**
 * Cœur financier de DEVISIA.
 *
 * Règle absolue : l'IA propose des données, le système calcule les montants.
 * Tous les montants sont manipulés en centimes entiers, toutes les
 * multiplications passent par de l'arithmétique entière, et chaque arrondi est
 * explicite (arrondi commercial au centime le plus proche, 0,5 vers le haut).
 */

/** Nombre de décimales autorisées sur une quantité. */
const QUANTITY_SCALE = 1000; // 3 décimales
const RATE_SCALE = 10000; // taux en % avec 2 décimales

export type Rounding = 'half-up';

/** Arrondi commercial déterministe (évite les surprises de Math.round sur les négatifs). */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Valeur numérique invalide');
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Convertit un montant en euros (saisi par l'utilisateur) en centimes entiers. */
export function eurosToCents(value: number | string): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.').replace(/\s/g, '')) : value;
  if (!Number.isFinite(n)) return 0;
  return roundHalfUp(n * 100);
}

/** Convertit des centimes en euros (nombre décimal, pour affichage/API). */
export function centsToEuros(cents: number): number {
  return roundHalfUp(cents) / 100;
}

/** Quantité normalisée en millièmes, pour un calcul entier exact. */
function quantityToMilli(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return roundHalfUp(quantity * QUANTITY_SCALE);
}

/** Taux (en %) normalisé sur 4 décimales entières. */
function rateToScaled(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  return roundHalfUp(rate * RATE_SCALE / 100); // 20 % -> 2000
}

/** Applique un pourcentage à un montant en centimes, arrondi au centime. */
export function applyRate(cents: number, ratePercent: number): number {
  return roundHalfUp((cents * rateToScaled(ratePercent)) / RATE_SCALE);
}

export interface LineInput {
  quantity: number;
  unitPriceCents: number;
  /** Remise appliquée à la ligne, en pourcentage (0–100). */
  discountRate?: number;
  /** Taux de TVA en pourcentage (ex. 20, 10, 5.5, 0). */
  vatRate: number;
  costPriceCents?: number | null;
}

export interface LineTotals {
  grossCents: number;
  discountCents: number;
  lineTotalCents: number;
  vatCents: number;
  totalWithVatCents: number;
  marginCents: number | null;
  marginRate: number | null;
}

/** Calcule les totaux d'une ligne de devis. Exact, sans dérive flottante. */
export function computeLine(line: LineInput): LineTotals {
  const qtyMilli = quantityToMilli(line.quantity);
  const grossCents = roundHalfUp((qtyMilli * Math.trunc(line.unitPriceCents)) / QUANTITY_SCALE);
  const discountCents = applyRate(grossCents, clampRate(line.discountRate ?? 0));
  const lineTotalCents = grossCents - discountCents;
  const vatCents = applyRate(lineTotalCents, clampRate(line.vatRate, 100));
  const cost =
    line.costPriceCents == null
      ? null
      : roundHalfUp((qtyMilli * Math.trunc(line.costPriceCents)) / QUANTITY_SCALE);
  const marginCents = cost == null ? null : lineTotalCents - cost;
  const marginRate =
    marginCents == null || lineTotalCents === 0
      ? null
      : roundHalfUp((marginCents / lineTotalCents) * 10000) / 100;

  return {
    grossCents,
    discountCents,
    lineTotalCents,
    vatCents,
    totalWithVatCents: lineTotalCents + vatCents,
    marginCents,
    marginRate,
  };
}

function clampRate(rate: number, max = 100): number {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(Math.max(rate, 0), max);
}

export interface QuoteTotalsInput {
  lines: LineInput[];
  /** Remise globale en pourcentage appliquée après les remises de ligne. */
  globalDiscountRate?: number;
  /** Acompte demandé, en pourcentage du TTC. */
  depositRate?: number;
  /** Franchise en base de TVA (art. 293 B du CGI) : aucune TVA facturée. */
  vatExempt?: boolean;
}

export interface QuoteTotals {
  subtotalCents: number;
  discountCents: number;
  netSubtotalCents: number;
  vatCents: number;
  totalCents: number;
  depositCents: number;
  marginCents: number | null;
  vatBreakdown: { rate: number; baseCents: number; vatCents: number }[];
  lines: LineTotals[];
}

/**
 * Totaux d'un devis complet.
 *
 * La remise globale est répartie proportionnellement sur chaque ligne afin que
 * la ventilation de TVA par taux reste exacte (obligation légale française :
 * le détail par taux doit correspondre au total).
 */
export function computeQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const globalDiscountRate = clampRate(input.globalDiscountRate ?? 0);
  const lineTotals = input.lines.map(computeLine);

  const subtotalCents = lineTotals.reduce((acc, l) => acc + l.lineTotalCents, 0);
  const discountCents = applyRate(subtotalCents, globalDiscountRate);
  const netSubtotalCents = subtotalCents - discountCents;

  // Répartition de la remise globale au prorata, avec correction du reliquat
  // sur la ligne la plus importante pour garantir la somme exacte.
  const shares = allocateProportionally(
    discountCents,
    lineTotals.map((l) => l.lineTotalCents),
  );

  const byRate = new Map<number, { baseCents: number; vatCents: number }>();
  input.lines.forEach((line, index) => {
    const rate = input.vatExempt ? 0 : clampRate(line.vatRate, 100);
    const base = (lineTotals[index]?.lineTotalCents ?? 0) - (shares[index] ?? 0);
    const bucket = byRate.get(rate) ?? { baseCents: 0, vatCents: 0 };
    bucket.baseCents += base;
    byRate.set(rate, bucket);
  });

  let vatCents = 0;
  const vatBreakdown = [...byRate.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, bucket]) => {
      const vat = applyRate(bucket.baseCents, rate);
      vatCents += vat;
      return { rate, baseCents: bucket.baseCents, vatCents: vat };
    });

  const totalCents = netSubtotalCents + vatCents;
  const depositCents = applyRate(totalCents, clampRate(input.depositRate ?? 0));

  const knownMargins = lineTotals.filter((l) => l.marginCents != null);
  const marginCents =
    knownMargins.length === 0
      ? null
      : knownMargins.reduce((acc, l) => acc + (l.marginCents ?? 0), 0) - discountCents;

  return {
    subtotalCents,
    discountCents,
    netSubtotalCents,
    vatCents,
    totalCents,
    depositCents,
    marginCents,
    vatBreakdown,
    lines: lineTotals,
  };
}

/**
 * Répartit un montant entier proportionnellement à des poids, sans perte :
 * la somme des parts est toujours strictement égale au montant d'origine.
 */
export function allocateProportionally(amountCents: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (amountCents === 0 || total === 0) return weights.map(() => 0);

  const raw = weights.map((w) => (amountCents * w) / total);
  const floored = raw.map((v) => Math.floor(v));
  let remainder = amountCents - floored.reduce((a, b) => a + b, 0);

  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floored];
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    const target = order[cursor % order.length];
    if (target) result[target.i] = (result[target.i] ?? 0) + 1;
    remainder -= 1;
    cursor += 1;
  }
  return result;
}

const FR_CURRENCY = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FR_CURRENCY_COMPACT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formate des centimes en euros — « 4 850,00 € ». */
export function formatCents(cents: number, opts: { compact?: boolean } = {}): string {
  const value = centsToEuros(cents ?? 0);
  return (opts.compact ? FR_CURRENCY_COMPACT : FR_CURRENCY).format(value);
}

export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(quantity);
}

export function formatPercent(rate: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(rate) + ' %';
}

/** Taux de TVA usuels en France pour le bâtiment et les services. */
export const VAT_RATES = [
  { value: 20, label: '20 % — taux normal' },
  { value: 10, label: '10 % — rénovation (logement > 2 ans)' },
  { value: 5.5, label: '5,5 % — rénovation énergétique' },
  { value: 0, label: '0 % — non assujetti / autoliquidation' },
] as const;
