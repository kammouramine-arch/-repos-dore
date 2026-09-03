import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupOrganization,
  createTestCustomer,
  createTestOrganization,
  prisma,
  sampleItems,
} from '../helpers';
import {
  createQuote,
  updateQuote,
  deleteQuote,
  getQuote,
  registerClientDecision,
  registerQuoteView,
  expireOutdatedQuotes,
} from '@/server/services/quoteService';
import { nextDocumentNumber, formatDocumentNumber } from '@/server/services/numberingService';

let orgA: Awaited<ReturnType<typeof createTestOrganization>>;
let orgB: Awaited<ReturnType<typeof createTestOrganization>>;
let customerA: Awaited<ReturnType<typeof createTestCustomer>>;

beforeAll(async () => {
  orgA = await createTestOrganization('Plomberie A');
  orgB = await createTestOrganization('Plomberie B');
  customerA = await createTestCustomer(orgA.organization.id);
});

afterAll(async () => {
  await cleanupOrganization(orgA.organization.id, orgA.user.id);
  await cleanupOrganization(orgB.organization.id, orgB.user.id);
  await prisma.$disconnect();
});

describe('numérotation des devis', () => {
  it('incrémente séquentiellement par entreprise et par année', async () => {
    const first = await nextDocumentNumber(orgA.organization.id, 'QUOTE', prisma, 2030);
    const second = await nextDocumentNumber(orgA.organization.id, 'QUOTE', prisma, 2030);
    const otherOrg = await nextDocumentNumber(orgB.organization.id, 'QUOTE', prisma, 2030);

    expect(first).toBe('DEV-2030-0001');
    expect(second).toBe('DEV-2030-0002');
    expect(otherOrg).toBe('DEV-2030-0001');
  });

  it('ne produit aucune collision malgré des créations simultanées', async () => {
    const numbers = await Promise.all(
      Array.from({ length: 12 }, () => nextDocumentNumber(orgA.organization.id, 'QUOTE', prisma, 2031)),
    );
    expect(new Set(numbers).size).toBe(12);
  });

  it('formate sur quatre chiffres', () => {
    expect(formatDocumentNumber('QUOTE', 2026, 7)).toBe('DEV-2026-0007');
    expect(formatDocumentNumber('INVOICE', 2026, 1234)).toBe('FAC-2026-1234');
  });
});

describe('cycle de vie d’un devis', () => {
  it('crée un devis avec des totaux calculés par le serveur', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Remplacement du siphon',
      items: sampleItems,
    });

    // 3200 + 8250 = 11450 HT, TVA 10 % = 1145
    expect(quote.subtotalCents).toBe(11_450);
    expect(quote.vatCents).toBe(1145);
    expect(quote.totalCents).toBe(12_595);
    expect(quote.status).toBe('BROUILLON');
    expect(quote.publicToken).toHaveLength(32);
    expect(quote.items).toHaveLength(2);
  });

  it('ignore des totaux fournis par le client et recalcule', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Tentative de manipulation des totaux',
      // Aucun total n'est accepté en entrée : le service n'expose pas ces champs.
      items: [{ ...sampleItems[0]!, quantity: 2, unitPriceCents: 10_000 }],
    });
    expect(quote.subtotalCents).toBe(20_000);
    expect(quote.totalCents).toBe(22_000);
  });

  it('met à jour les lignes et recalcule les montants', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis à modifier',
      items: sampleItems,
    });

    const updated = await updateQuote(orgA.organization.id, orgA.user.id, quote.id, {
      customerId: customerA.id,
      title: 'Devis modifié',
      discountRate: 10,
      items: [{ ...sampleItems[0]!, quantity: 4 }],
    });

    expect(updated.title).toBe('Devis modifié');
    expect(updated.subtotalCents).toBe(12_800);
    expect(updated.discountCents).toBe(1280);
    expect(updated.netSubtotalCents).toBe(11_520);
    expect(updated.vatCents).toBe(1152);
    const items = await prisma.quoteItem.findMany({ where: { quoteId: quote.id } });
    expect(items).toHaveLength(1);
  });

  it('enregistre la consultation client et bascule le statut', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis consulté',
      items: sampleItems,
    });
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'ENVOYE', sentAt: new Date() },
    });

    await registerQuoteView(quote.publicToken, { ipHash: 'abc', userAgent: 'test' });
    const afterView = await getQuote(orgA.organization.id, quote.id);

    expect(afterView.status).toBe('CONSULTE');
    expect(afterView.viewCount).toBe(1);
    expect(afterView.firstViewedAt).not.toBeNull();

    const notifications = await prisma.notification.findMany({
      where: { organizationId: orgA.organization.id, type: 'DEVIS_CONSULTE' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('accepte un devis depuis la page publique et notifie', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis à accepter',
      items: sampleItems,
    });
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'ENVOYE', sentAt: new Date() },
    });

    const accepted = await registerClientDecision(quote.publicToken, 'ACCEPTE', {
      signatureName: 'Jean Dupont',
    });

    expect(accepted.status).toBe('ACCEPTE');
    expect(accepted.acceptedAt).not.toBeNull();
    expect(accepted.signatureName).toBe('Jean Dupont');

    const notifications = await prisma.notification.findMany({
      where: { organizationId: orgA.organization.id, type: 'DEVIS_ACCEPTE' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('refuse une seconde décision sur un devis déjà tranché', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis déjà répondu',
      items: sampleItems,
    });
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'ENVOYE' } });
    await registerClientDecision(quote.publicToken, 'REFUSE', { message: 'Trop cher' });

    await expect(
      registerClientDecision(quote.publicToken, 'ACCEPTE', {}),
    ).rejects.toThrowError(/déjà reçu une réponse/i);
  });

  it('empêche la suppression d’un devis accepté', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis signé',
      items: sampleItems,
    });
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTE' } });

    await expect(deleteQuote(orgA.organization.id, orgA.user.id, quote.id)).rejects.toThrowError(
      /accepté/i,
    );
  });

  it('expire les devis dont la validité est dépassée', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis périmé',
      items: sampleItems,
      validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'ENVOYE' } });

    const count = await expireOutdatedQuotes(orgA.organization.id);
    expect(count).toBeGreaterThan(0);

    const refreshed = await getQuote(orgA.organization.id, quote.id);
    expect(refreshed.status).toBe('EXPIRE');
  });
});

describe('isolation stricte des organisations', () => {
  it('empêche la lecture d’un devis d’une autre entreprise', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis confidentiel',
      items: sampleItems,
    });

    await expect(getQuote(orgB.organization.id, quote.id)).rejects.toThrowError(
      /devis introuvable/i,
    );
  });

  it('empêche la modification d’un devis d’une autre entreprise', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis protégé',
      items: sampleItems,
    });

    await expect(
      updateQuote(orgB.organization.id, orgB.user.id, quote.id, {
        customerId: customerA.id,
        title: 'Tentative',
        items: sampleItems,
      }),
    ).rejects.toThrowError();
  });

  it('empêche de rattacher un devis à un client d’une autre entreprise', async () => {
    await expect(
      createQuote(orgB.organization.id, orgB.user.id, {
        customerId: customerA.id,
        title: 'Client volé',
        items: sampleItems,
      }),
    ).rejects.toThrowError(/client introuvable/i);
  });

  it('empêche la suppression croisée', async () => {
    const quote = await createQuote(orgA.organization.id, orgA.user.id, {
      customerId: customerA.id,
      title: 'Devis A',
      items: sampleItems,
    });
    await expect(deleteQuote(orgB.organization.id, orgB.user.id, quote.id)).rejects.toThrowError();
  });
});
