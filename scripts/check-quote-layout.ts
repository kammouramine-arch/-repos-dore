import { mkdir, writeFile } from 'node:fs/promises';
import { renderQuotePdf } from '../src/lib/pdf/quote-pdf';

async function main() {
  const bytes = await renderQuotePdf({
    number: 'TEST-2026-001', title: 'Remplacement de siphon de cuisine', createdAt: new Date('2026-09-05'),
    company: { name: 'DEVISIA — Entreprise de démonstration', addressLine1: 'Adresse de démonstration', vatExempt: false },
    customer: { name: 'Client de démonstration' },
    lines: [
      { label: 'Fourniture et remplacement du siphon', unit: 'u', quantity: 2, unitPriceCents: 4502, discountRate: 0, vatRate: 20, lineTotalCents: 9004 },
      { label: 'Déplacement et vérification de l’étanchéité', unit: 'forfait', quantity: 1, unitPriceCents: 3500, discountRate: 0, vatRate: 20, lineTotalCents: 3500 },
    ], subtotalCents: 12504, discountRate: 0, discountCents: 0, netSubtotalCents: 12504,
    vatBreakdown: [{ rate: 20, baseCents: 12504, vatCents: 2501 }], vatCents: 2501,
    totalCents: 15005, depositCents: 0,
  });
  await mkdir('output/pdf', { recursive: true });
  await writeFile('output/pdf/quote-layout-check.pdf', bytes);
}
void main();
