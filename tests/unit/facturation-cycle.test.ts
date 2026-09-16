import { describe, expect, it } from 'vitest';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
  INVOICE_STATUS_LABELS,
  PLANS,
  featureBlock,
  firstPlanWithFeature,
  type ExpenseCategoryId,
  type InvoiceStatusId,
} from '@devisia/shared';
import { balanceOf, deriveInvoiceStatus } from '@/server/services/invoiceService';
import { quoteDocumentHash } from '@/server/services/signatureService';
import { effectiveTemplate } from '@/server/services/brandingService';

/**
 * Règles métier du cycle devis → signature → facture → encaissement.
 *
 * Ce sont les calculs dont une erreur coûte de l'argent à l'artisan ou fait
 * passer une facture impayée pour réglée. Ils sont testés sans base de
 * données : ce sont des fonctions pures, et elles doivent le rester.
 */

const BASE = {
  status: 'ENVOYEE',
  totalCents: 120_000,
  depositCents: 0,
  paidCents: 0,
  dueAt: new Date(Date.now() + 10 * 864e5),
  sentAt: new Date(),
};

describe('restant dû', () => {
  it('déduit l’acompte et les encaissements', () => {
    expect(balanceOf({ totalCents: 120_000, depositCents: 30_000, paidCents: 20_000 })).toBe(70_000);
  });

  it('ne descend jamais sous zéro', () => {
    // Un trop-perçu ne doit pas produire un restant dû négatif qui viendrait
    // se soustraire du total « en attente de règlement » de l'écran factures.
    expect(balanceOf({ totalCents: 100_000, depositCents: 60_000, paidCents: 60_000 })).toBe(0);
  });
});

describe('statut de facture', () => {
  it('reste brouillon tant que la facture n’est pas émise', () => {
    expect(deriveInvoiceStatus({ ...BASE, status: 'BROUILLON', sentAt: null })).toBe('BROUILLON');
  });

  it('passe à payée quand le solde est nul', () => {
    expect(deriveInvoiceStatus({ ...BASE, paidCents: 120_000 })).toBe('PAYEE');
  });

  it('compte l’acompte dans le solde', () => {
    expect(deriveInvoiceStatus({ ...BASE, depositCents: 40_000, paidCents: 80_000 })).toBe('PAYEE');
  });

  it('distingue le règlement partiel', () => {
    expect(deriveInvoiceStatus({ ...BASE, paidCents: 50_000 })).toBe('PARTIELLE');
  });

  it('signale le retard après l’échéance', () => {
    const overdue = { ...BASE, dueAt: new Date(Date.now() - 864e5) };
    expect(deriveInvoiceStatus(overdue)).toBe('EN_RETARD');
    expect(deriveInvoiceStatus({ ...overdue, paidCents: 50_000 })).toBe('EN_RETARD');
  });

  it('ne requalifie jamais une facture annulée', () => {
    expect(deriveInvoiceStatus({ ...BASE, status: 'ANNULEE', paidCents: 120_000 })).toBe('ANNULEE');
  });

  it('une facture soldée n’est pas en retard', () => {
    expect(deriveInvoiceStatus({ ...BASE, dueAt: new Date(Date.now() - 864e5), paidCents: 120_000 })).toBe('PAYEE');
  });

  it('porte un libellé pour chaque statut', () => {
    const statuses: InvoiceStatusId[] = ['BROUILLON', 'ENVOYEE', 'PARTIELLE', 'PAYEE', 'EN_RETARD', 'ANNULEE'];
    for (const status of statuses) expect(INVOICE_STATUS_LABELS[status]).toBeTruthy();
  });
});

describe('empreinte du devis signé', () => {
  const quote = {
    totalCents: 120_000,
    netSubtotalCents: 100_000,
    vatCents: 20_000,
    depositCents: 0,
    validUntil: new Date('2026-12-31'),
    items: [{ label: 'Mitigeur', quantity: 1, unitPriceCents: 12_000, vatRate: 20, lineTotalCents: 12_000 }],
  };

  it('est stable pour un contenu inchangé', () => {
    expect(quoteDocumentHash(quote)).toBe(quoteDocumentHash({ ...quote }));
  });

  it('change dès qu’un prix bouge', () => {
    const changed = { ...quote, items: [{ ...quote.items[0]!, unitPriceCents: 13_000 }] };
    expect(quoteDocumentHash(changed)).not.toBe(quoteDocumentHash(quote));
  });

  it('change quand le total change', () => {
    expect(quoteDocumentHash({ ...quote, totalCents: 121_000 })).not.toBe(quoteDocumentHash(quote));
  });

  it('change quand une ligne est ajoutée', () => {
    const extra = { ...quote, items: [...quote.items, { label: 'Déplacement', quantity: 1, unitPriceCents: 3_500, vatRate: 20, lineTotalCents: 3_500 }] };
    expect(quoteDocumentHash(extra)).not.toBe(quoteDocumentHash(quote));
  });
});

describe('droits de formule', () => {
  it('réserve l’encaissement en ligne, les reçus et l’export comptable à Pro', () => {
    for (const feature of ['clientPayments', 'receiptScanning', 'accountantExport', 'advancedBranding'] as const) {
      expect(featureBlock('ESSENTIEL', feature).blocked).toBe(true);
      expect(featureBlock('PRO', feature).blocked).toBe(false);
      expect(featureBlock('ENTREPRISE', feature).blocked).toBe(false);
      expect(firstPlanWithFeature(feature)).toBe('PRO');
    }
  });

  it('explique le refus en nommant la formule requise', () => {
    const verdict = featureBlock('ESSENTIEL', 'clientPayments');
    expect(verdict.requiredPlan).toBe('PRO');
    expect(verdict.reason).toContain('Pro');
  });

  it('réserve le travail en équipe aux formules qui le vendent', () => {
    expect(featureBlock('ESSENTIEL', 'team').blocked).toBe(true);
    expect(featureBlock('ENTREPRISE', 'team').blocked).toBe(false);
  });

  it('accorde plus de justificatifs aux formules supérieures', () => {
    expect(PLANS.ESSENTIEL.limits.receiptScans).toBe(0);
    expect(PLANS.PRO.limits.receiptScans).toBe(200);
    // null signifie « sans limite ».
    expect(PLANS.ENTREPRISE.limits.receiptScans).toBeNull();
  });
});

describe('modèle de document', () => {
  it('retombe sur Minimal quand la formule ne couvre plus les modèles avancés', () => {
    expect(effectiveTemplate('EXECUTIF', false)).toBe('MINIMAL');
    expect(effectiveTemplate('MODERNE', false)).toBe('MINIMAL');
  });

  it('respecte le choix quand la formule le couvre', () => {
    expect(effectiveTemplate('EXECUTIF', true)).toBe('EXECUTIF');
  });

  it('laisse Minimal ouvert à toutes les formules', () => {
    expect(effectiveTemplate('MINIMAL', false)).toBe('MINIMAL');
  });
});

describe('postes de dépense', () => {
  it('porte un libellé pour chaque poste proposé', () => {
    for (const category of EXPENSE_CATEGORY_ORDER) {
      expect(EXPENSE_CATEGORY_LABELS[category as ExpenseCategoryId]).toBeTruthy();
    }
  });

  it('propose tous les postes de l’énumération', () => {
    expect(EXPENSE_CATEGORY_ORDER.length).toBe(Object.keys(EXPENSE_CATEGORY_LABELS).length);
  });
});

describe('brouillon ayant reçu un règlement', () => {
  it('cesse d’être un brouillon dès qu’un encaissement existe', () => {
    // Sans cette règle, un acompte encaissé sur une facture encore en
    // brouillon disparaissait du total en attente de règlement.
    const draft = { ...BASE, status: 'BROUILLON', sentAt: null };
    expect(deriveInvoiceStatus(draft)).toBe('BROUILLON');
    expect(deriveInvoiceStatus({ ...draft, paidCents: 40_000 })).toBe('PARTIELLE');
    expect(deriveInvoiceStatus({ ...draft, paidCents: 120_000 })).toBe('PAYEE');
  });
});
