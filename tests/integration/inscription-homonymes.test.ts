import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../helpers';
import { createOrganization, uniqueSlug } from '@/server/services/organizationService';

/**
 * Inscription d'entreprises homonymes.
 *
 * Le slug était sondé suffixe par suffixe, sans borne, à l'intérieur de la
 * transaction de création. Deux « Plomberie Martin » passaient ; vingt-cinq
 * homonymes faisaient autant d'allers-retours en base avant le premier
 * `insert`, dépassaient le délai de transaction, et l'inscription échouait en
 * 500 sans rien dire. Un nom d'entreprise banal devient fréquent avec le
 * succès : ce cas le rejoue.
 */
const NOM = 'ZZ Plomberie Homonyme';
const creees: string[] = [];

afterAll(async () => {
  for (const id of creees) await prisma.organization.delete({ where: { id } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { email: { startsWith: 'zz-homonyme-' } } }).catch(() => undefined);
});

async function inscrire(index: number) {
  const user = await prisma.user.create({
    data: { email: `zz-homonyme-${index}-${Date.now()}@devisia-verif.test`, passwordHash: 'x' },
    select: { id: true },
  });
  const org = await createOrganization({ name: NOM, ownerUserId: user.id });
  creees.push(org.id);
  return org;
}

describe('entreprises homonymes', () => {
  it('accepte trente inscriptions du même nom, avec des slugs distincts', async () => {
    const slugs = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      const org = await inscrire(i);
      expect(org.slug, `inscription ${i + 1}`).toBeTruthy();
      slugs.add(org.slug);
    }
    expect(slugs.size).toBe(30);
  }, 60_000);

  it('garde un slug lisible pour les premiers, quitte à tirer au sort ensuite', async () => {
    const tous = [...creees];
    const orgs = await prisma.organization.findMany({
      where: { id: { in: tous } },
      select: { slug: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(orgs[0]!.slug).toBe('zz-plomberie-homonyme');
    expect(orgs[1]!.slug).toBe('zz-plomberie-homonyme-2');
    for (const o of orgs) expect(o.slug.startsWith('zz-plomberie-homonyme')).toBe(true);
  });

  it('ne sonde qu’un nombre borné de suffixes', async () => {
    let requetes = 0;
    const client = {
      organization: {
        findMany: async (args: { where: { slug: { in: string[] } } }) => {
          requetes += 1;
          expect(args.where.slug.in.length).toBeLessThanOrEqual(6);
          return [];
        },
      },
    } as unknown as typeof prisma;
    await uniqueSlug('Peinture Dupont', client);
    expect(requetes).toBe(1);
  });
});
