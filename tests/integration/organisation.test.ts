import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { businessProfileSchema } from '@/server/validation';

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
