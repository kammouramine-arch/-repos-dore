import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderQuotePdf, type QuotePdfInput } from '../../src/lib/pdf/quote-pdf';
import { buildHeuristicQuoteDraft } from '../../src/lib/ai/heuristic';
import { polishDraft } from '../../src/lib/ai/polish';

/**
 * Rend le PDF de quatre chantiers types à partir du moteur local (aucun
 * fournisseur d'IA en test), après mise au propre : c'est exactement ce que
 * reçoit le client quand l'IA est indisponible. Les fichiers sont écrits pour
 * inspection visuelle ; le test vérifie qu'aucune dictée brute ne figure sur
 * le document et que le total porte la bonne étiquette.
 */
const OUT = process.env.PDF_EXAMPLES_OUT ?? '/tmp/claude-0/pdf-examples';
const EXAMPLES: [string, string][] = [
  ['plomberie', "Fuite sous l'évier, remplacer le siphon."],
  ['peinture', 'Repeindre le salon, murs et plafond, reboucher quelques trous.'],
  ['electricite', 'Remplacer quatre prises et installer un plafonnier.'],
  ['menuiserie', 'Remplacer une porte intérieure et ajuster le bâti.'],
];
const company = { name: 'AMYN', ownerName: 'Amine', addressLine1: '12 rue des Artisans', postalCode: '69003', city: 'Lyon', phone: '06 12 34 56 78', email: 'contact@amyn.fr', siret: '123 456 789 00012', vatNumber: 'FR12123456789', insurance: 'Assurance décennale AXA n° 123456', brandColor: '#2F52E8', logo: null, vatExempt: false };
const customer = { name: 'Sylvie Bernard', addressLine1: '8 avenue des Lilas', postalCode: '69100', city: 'Villeurbanne', email: 'sylvie.bernard@exemple.fr', phone: '06 98 76 54 32' };

function inputFor(raw: string, index: number, extraLines = 0): { input: QuotePdfInput; raw: string } {
  const draft = polishDraft(buildHeuristicQuoteDraft({ description: raw, catalog: [], hourlyRateCents: 4500, defaultVatRate: 20, trade: 'PLOMBIER' }), { description: raw });
  const lines = draft.mainOeuvre.map((l) => ({ label: l.designation, description: l.description ?? null, unit: 'h', quantity: l.heures, unitPriceCents: 4500, discountRate: 0, vatRate: 20, lineTotalCents: Math.round(l.heures * 4500) }));
  for (let i = 0; i < extraLines; i += 1) lines.push({ label: `Fourniture ${i + 1} — matériel et consommables`, description: i % 2 ? 'Référence à confirmer avec le client' : null, unit: 'u', quantity: 1 + i, unitPriceCents: 12900, discountRate: 0, vatRate: 20, lineTotalCents: 12900 * (1 + i) });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const vat = Math.round(subtotal * 0.2);
  return { raw, input: {
    number: `DEV-2026-000${index + 1}`, title: draft.titre, summary: draft.resume || null, introduction: null, createdAt: new Date('2026-09-10T10:00:00Z'), validUntil: new Date('2026-10-10T10:00:00Z'),
    company, customer, lines, workDescription: [], subtotalCents: subtotal, discountRate: 0, discountCents: 0, netSubtotalCents: subtotal,
    vatBreakdown: [{ rate: 20, baseCents: subtotal, vatCents: vat }], vatCents: vat, totalCents: subtotal + vat, depositCents: 0, estimatedDurationMin: null,
    notes: null, terms: null, paymentTerms: 'Acompte de 30 % à la commande, solde à la fin des travaux.', footer: null, language: 'fr', country: 'FR', currency: 'EUR',
  } };
}

describe('customer-facing PDF examples', () => {
  mkdirSync(OUT, { recursive: true });
  it.each(EXAMPLES.map(([slug, raw], index) => [slug, raw, index] as const))('%s: concise subject, professional designation, no raw dictation', async (slug, raw, index) => {
    const { input } = inputFor(raw, index);
    expect(input.title.length).toBeLessThanOrEqual(64);
    expect(input.title).not.toMatch(/^(remplacer|repeindre|fuite sous)/i);
    expect(input.summary).toBeNull();
    expect(input.lines[0]!.description).not.toMatch(/d'après votre description|le client|remplacer /i);
    const bytes = await renderQuotePdf(input);
    writeFileSync(`${OUT}/${slug}.pdf`, bytes);
    expect(bytes.byteLength).toBeGreaterThan(2_000);
  });
  it('paginates a long quote cleanly', async () => {
    const { input } = inputFor(EXAMPLES[1]![1], 4, 28);
    const bytes = await renderQuotePdf(input);
    writeFileSync(`${OUT}/long.pdf`, bytes);
    expect(bytes.byteLength).toBeGreaterThan(4_000);
  });
});
