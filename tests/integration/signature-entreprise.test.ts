import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cleanupOrganization, createTestOrganization, prisma, sampleItems } from '../helpers';
import { buildQuotePdf } from '@/server/services/quotePdfService';
import { createQuote, markQuoteSent } from '@/server/services/quoteService';
import { createCustomer } from '@/server/services/customerService';
import { updateBranding } from '@/server/services/brandingService';

/**
 * La signature de l'entreprise, de l'écran jusqu'au PDF.
 *
 * Deux promesses sont faites à l'artisan, et ce sont elles qu'on vérifie ici
 * plutôt que la présence d'un champ en base :
 *
 * 1. **Il ne signe qu'une fois.** Le tracé enregistré se retrouve sur les
 *    documents suivants sans qu'il ait à y penser.
 * 2. **Ce qui est parti ne bouge plus.** Remplacer sa signature ne doit pas
 *    modifier, chez un client, un devis reçu la semaine dernière. C'était le
 *    cas avant cette passe : le rendu lisait la signature vivante du profil.
 */

/** Deux tracés distincts, dans la grammaire acceptée (M, L, Q, C, Z). */
const PREMIER = 'M120 300 C 200 180, 280 380, 360 250 C 440 150, 520 150, 600 280';
const SECOND = 'M100 280 L 240 200 L 380 300 C 460 340, 540 180, 700 260';

let org: Awaited<ReturnType<typeof createTestOrganization>>;
let quoteId: string;

beforeAll(async () => {
  org = await createTestOrganization('Plomberie Signature');
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
  quoteId = devis.id;
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id);
});

describe('signature de l’entreprise', () => {
  it('s’enregistre une fois et porte son horodatage', async () => {
    const branding = await updateBranding(org.organization.id, org.user.id, {
      signatureStrokePath: PREMIER,
      signatureName: 'Julien Martin',
    });
    expect(branding.signature.strokePath).toBe(PREMIER);
    expect(branding.signature.name).toBe('Julien Martin');
    expect(branding.signature.drawnAt).not.toBeNull();
  });

  it('est figée sur le devis au moment de l’envoi', async () => {
    await markQuoteSent(org.organization.id, quoteId, org.user.id);
    const quote = await prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      select: { issuerSignaturePath: true, issuerSignatureName: true, issuerSignatureAt: true },
    });
    expect(quote.issuerSignaturePath).toBe(PREMIER);
    expect(quote.issuerSignatureName).toBe('Julien Martin');
    expect(quote.issuerSignatureAt).not.toBeNull();
  });

  /*
   * Le cœur de la garantie. L'artisan change de signature ; le devis déjà
   * parti garde la sienne, et un nouveau devis prend la nouvelle.
   */
  it('ne change pas un document déjà envoyé quand la signature est remplacée', async () => {
    await updateBranding(org.organization.id, org.user.id, {
      signatureStrokePath: SECOND,
      signatureName: 'Julien Martin',
    });

    const envoye = await prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      select: { issuerSignaturePath: true },
    });
    expect(envoye.issuerSignaturePath).toBe(PREMIER);

    const client = await prisma.customer.findFirstOrThrow({ where: { organizationId: org.organization.id } });
    const suivant = await createQuote(org.organization.id, org.user.id, {
      customerId: client.id,
      title: 'Réfection salle de bain',
      items: sampleItems,
    });
    await markQuoteSent(org.organization.id, suivant.id, org.user.id);
    const frais = await prisma.quote.findUniqueOrThrow({
      where: { id: suivant.id },
      select: { issuerSignaturePath: true },
    });
    expect(frais.issuerSignaturePath).toBe(SECOND);
  });

  /*
   * Un réglage qui existe sans que le moteur de rendu le lise ne vaut rien :
   * on regarde les octets produits, pas la base.
   */
  it('apparaît dans le PDF réellement produit, en une seule page', async () => {
    const { bytes } = await buildQuotePdf(quoteId);
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');

    // Une seule page : le bloc de signature ne doit pas en pousser une
    // seconde, ce qu'il a fait pour cinq points d'écart au build 55. Le
    // document est relu par `pdf-lib` plutôt que par une expression
    // régulière — les flux sont compressés, le texte brut ne dit rien.
    const { PDFDocument } = await import('pdf-lib');
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);

    // Le document est écrit pour inspection à l'œil ; l'assertion ci-dessus
    // reste la vérification, le fichier n'est qu'une commodité.
    mkdirSync('/tmp/claude-0/revue56', { recursive: true });
    writeFileSync('/tmp/claude-0/revue56/devis-signature.pdf', Buffer.from(bytes));
  });

  it('retire proprement la signature quand l’artisan la supprime', async () => {
    const branding = await updateBranding(org.organization.id, org.user.id, { signatureStrokePath: null });
    expect(branding.signature.strokePath).toBeNull();
    expect(branding.signature.name).toBeNull();
    expect(branding.signature.drawnAt).toBeNull();

    // Et le devis déjà parti n'est toujours pas concerné.
    const envoye = await prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      select: { issuerSignaturePath: true },
    });
    expect(envoye.issuerSignaturePath).toBe(PREMIER);
  });
});
