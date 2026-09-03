import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { businessProfileSchema } from '@/server/validation';
import { customerDisplayName } from '@/server/dto';
import { PRICE_BOOK_CATEGORIES, PRICE_BOOK_CATEGORY_LABELS } from '@devisia/shared';
import { createCustomer, listCustomers } from '@/server/services/customerService';

/**
 * Profil d'entreprise exposé au mobile.
 *
 * La première version de la route sélectionnait `defaultHourlyRateCents` et
 * `depositPercent`, deux champs qui n'existent pas : le typage laissait passer
 * l'erreur, et l'écran répondait 500 en production. Ces cas comparent la
 * sélection au modèle réel, pour qu'un champ inventé échoue ici plutôt que sur
 * le téléphone d'un artisan.
 */
let org: Awaited<ReturnType<typeof createTestOrganization>>;

beforeAll(async () => {
  org = await createTestOrganization('Organisation');
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id);
});

/** Champs que la route expose au mobile, dans l'ordre du modèle. */
const EXPOSED = [
  'legalName',
  'ownerName',
  'email',
  'phone',
  'website',
  'addressLine1',
  'addressLine2',
  'city',
  'postalCode',
  'country',
  'siret',
  'vatNumber',
  'insurance',
  'trade',
  'vatStatus',
  'defaultVatRate',
  'defaultHourlyCents',
  'quoteValidityDays',
  'paymentTerms',
  'quoteTerms',
  'quoteFooter',
  'brandColor',
  'logoFileId',
] as const;

describe('profil d’entreprise', () => {
  it('n’expose que des champs qui existent réellement', async () => {
    const profile = await prisma.businessProfile.findUnique({
      where: { organizationId: org.organization.id },
      select: Object.fromEntries(EXPOSED.map((field) => [field, true])) as Record<string, true>,
    });
    expect(profile).not.toBeNull();
    for (const field of EXPOSED) {
      expect(Object.hasOwn(profile as object, field)).toBe(true);
    }
  });

  it('accepte la charge utile que l’écran mobile envoie', () => {
    const parsed = businessProfileSchema.safeParse({
      legalName: 'Plomberie Martin',
      ownerName: 'Karim Martin',
      email: 'contact@plomberie-martin.fr',
      phone: '0612345678',
      addressLine1: '12 rue des Lilas',
      postalCode: '69003',
      city: 'Lyon',
      country: 'FR',
      siret: '12345678900012',
      defaultHourlyCents: 5500,
      defaultVatRate: 10,
      quoteValidityDays: 30,
      paymentTerms: 'Acompte de 30 % à la commande.',
    });
    expect(parsed.success).toBe(true);
  });

  it('refuse un nom d’entreprise vide : il figure sur chaque devis', () => {
    const parsed = businessProfileSchema.safeParse({ legalName: '', country: 'FR' });
    expect(parsed.success).toBe(false);
  });

  it('enregistre puis relit une modification', async () => {
    await prisma.businessProfile.update({
      where: { organizationId: org.organization.id },
      data: { legalName: 'Plomberie Renommée', defaultHourlyCents: 6200 },
    });
    const after = await prisma.businessProfile.findUnique({
      where: { organizationId: org.organization.id },
      select: { legalName: true, defaultHourlyCents: true },
    });
    expect(after?.legalName).toBe('Plomberie Renommée');
    expect(after?.defaultHourlyCents).toBe(6200);
  });
});

/**
 * Nom affichable d'un client.
 *
 * Le contrat partagé annonce `displayName` ; la conversion serveur ne le
 * produisait pas, et le répertoire mobile affichait des fiches sans nom. Ce
 * cas fige le comportement attendu, y compris pour une fiche créée à la volée
 * pendant un devis, qui n'a souvent qu'un nom de famille.
 */
describe('nom affichable d’un client', () => {
  it('donne un nom à une fiche créée avec le seul nom de famille', async () => {
    const created = await createCustomer(org.organization.id, org.user.id, {
      lastName: 'Dupont',
      phone: '0612345678',
    });
    expect(created.displayName).toBe('Dupont');
  });

  it('préfère la raison sociale au nom de la personne', () => {
    expect(
      customerDisplayName({ companyName: 'SCI des Lilas', firstName: 'Karim', lastName: 'Martin' }),
    ).toBe('SCI des Lilas');
  });

  it('n’affiche jamais une ligne vide', () => {
    expect(customerDisplayName({ companyName: null, firstName: null, lastName: null })).toBe(
      'Client sans nom',
    );
  });

  it('expose le nom dans la liste renvoyée au mobile', async () => {
    const list = await listCustomers(org.organization.id, { search: 'Dupont' });
    expect(list.items.length).toBeGreaterThan(0);
    for (const item of list.items) expect(item.displayName.length).toBeGreaterThan(0);
  });
});

/**
 * Catégories du catalogue de prix.
 *
 * Le contrat partagé typait la catégorie d'un article avec l'énumération des
 * lignes de devis — six valeurs pour quatre réellement acceptées. L'écran
 * mobile en a hérité deux inventées (« Forfait », « Déplacement ») que l'API
 * refusait en 422 au moment d'enregistrer. Ce cas compare la liste proposée à
 * l'énumération de la base.
 */
describe('catégories du catalogue', () => {
  it('ne propose que des catégories acceptées par la base', async () => {
    const attendues = await prisma.$queryRawUnsafe<{ value: string }[]>(
      `SELECT unnest(enum_range(NULL::"PriceBookCategory"))::text AS value`,
    );
    expect([...PRICE_BOOK_CATEGORIES].sort()).toEqual(attendues.map((r) => r.value).sort());
  });

  it('donne un libellé à chacune', () => {
    for (const value of PRICE_BOOK_CATEGORIES) {
      expect(PRICE_BOOK_CATEGORY_LABELS[value]?.length ?? 0).toBeGreaterThan(2);
    }
  });

  it('accepte chaque catégorie proposée sur une création réelle', async () => {
    for (const category of PRICE_BOOK_CATEGORIES) {
      const created = await prisma.priceBookItem.create({
        data: {
          organizationId: org.organization.id,
          name: `Article ${category}`,
          category,
          unit: 'u',
          salePriceCents: 1000,
          vatRate: 20,
        },
        select: { id: true, category: true },
      });
      expect(created.category).toBe(category);
    }
  });
});
