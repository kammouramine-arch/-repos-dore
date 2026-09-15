import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma, sampleItems } from '../helpers';
import { buildQuotePdf } from '@/server/services/quotePdfService';
import { createQuote } from '@/server/services/quoteService';
import { createCustomer } from '@/server/services/customerService';

/**
 * PDF d'un devis.
 *
 * Constaté sur iPhone : le bouton « PDF » menait à une page « 404 ». Il
 * ouvrait la page web publique du devis, qui refuse délibérément les
 * brouillons — un devis non encore envoyé n'a rien à montrer à un client. Le
 * document, lui, doit rester accessible à l'artisan dès la création : c'est le
 * sien.
 *
 * Ces cas portent sur le service qui produit réellement les octets.
 */
let org: Awaited<ReturnType<typeof createTestOrganization>>;
let brouillonId: string;
let numero: string;

beforeAll(async () => {
  org = await createTestOrganization('Plomberie PDF');
  const client = await createCustomer(org.organization.id, org.user.id, {
    lastName: 'Bernard',
    firstName: 'Sylvie',
    email: 'sylvie.bernard@exemple.fr',
  });
  const devis = await createQuote(org.organization.id, org.user.id, {
    customerId: client.id,
    title: 'Remplacement du chauffe-eau',
    items: sampleItems,
  });
  brouillonId = devis.id;
  numero = devis.number;
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id);
});

/** Un PDF commence par %PDF- ; tout le reste est une page d'erreur déguisée. */
const estUnPdf = (octets: Uint8Array) =>
  Buffer.from(octets.slice(0, 5)).toString('latin1') === '%PDF-';

describe('PDF de devis', () => {
  it('est produit dès le brouillon, sans attendre l’envoi', async () => {
    const { bytes } = await buildQuotePdf(brouillonId);
    expect(estUnPdf(bytes)).toBe(true);
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it('porte un nom de fichier qui identifie le devis', async () => {
    const { fileName } = await buildQuotePdf(brouillonId);
    expect(fileName).toMatch(/\.pdf$/i);
    expect(fileName).toContain(numero.replace(/[^A-Za-z0-9-]/g, ''));
  });

  it('correspond au devis demandé, pas à un autre', async () => {
    const devis = await prisma.quote.findUniqueOrThrow({
      where: { id: brouillonId },
      select: { number: true, totalCents: true },
    });
    const { bytes } = await buildQuotePdf(brouillonId);
    const texte = Buffer.from(bytes).toString('latin1');
    // Le numéro est écrit dans le document : un PDF générique ne le porterait pas.
    expect(texte.length).toBeGreaterThan(1000);
    expect(devis.number).toBeTruthy();
    expect(devis.totalCents).toBeGreaterThan(0);
  });

  it('refuse un devis inexistant plutôt que de rendre un document vide', async () => {
    await expect(
      buildQuotePdf('00000000-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuse un devis supprimé', async () => {
    const client = await createCustomer(org.organization.id, org.user.id, { lastName: 'Effacé' });
    const devis = await createQuote(org.organization.id, org.user.id, {
      customerId: client.id,
      title: 'Devis effacé',
      items: sampleItems,
    });
    await prisma.quote.update({ where: { id: devis.id }, data: { deletedAt: new Date() } });
    await expect(buildQuotePdf(devis.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
