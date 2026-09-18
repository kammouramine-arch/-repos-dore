import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestCustomer, createTestOrganization, prisma, sampleItems } from '../helpers';
import { askAssistant } from '@/server/services/assistantService';
import { createQuote } from '@/server/services/quoteService';

/**
 * L'assistant doit répondre à partir des données réelles de l'entreprise,
 * sans jamais inventer de chiffre ni franchir la frontière d'organisation.
 */
let org: Awaited<ReturnType<typeof createTestOrganization>>;
let other: Awaited<ReturnType<typeof createTestOrganization>>;

beforeAll(async () => {
  org = await createTestOrganization('Assistant');
  other = await createTestOrganization('Assistant concurrent');

  const customer = await createTestCustomer(org.organization.id);
  const accepted = await createQuote(org.organization.id, org.user.id, {
    customerId: customer.id,
    title: 'Installation chauffe-eau',
    items: sampleItems,
  });
  await prisma.quote.update({
    where: { id: accepted.id },
    data: { status: 'ACCEPTE', acceptedAt: new Date(), sentAt: new Date() },
  });

  const refused = await createQuote(org.organization.id, org.user.id, {
    customerId: customer.id,
    title: 'Rénovation salle de bain',
    items: sampleItems,
  });
  await prisma.quote.update({
    where: { id: refused.id },
    data: {
      status: 'REFUSE',
      refusedAt: new Date(),
      respondedAt: new Date(),
      sentAt: new Date(),
      clientMessage: 'Budget trop élevé',
    },
  });
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id, org.user.id);
  await cleanupOrganization(other.organization.id, other.user.id);
  await prisma.$disconnect();
});

describe('assistant', () => {
  it('répond sur les devis non aboutis avec les vraies données', async () => {
    const answer = await askAssistant(org.organization.id, org.user.id, 'Quels devis n’ont pas été acceptés ?');
    expect(answer.degraded).toBe(true); // moteur local, aucun appel externe
    expect(answer.answer).toMatch(/Rénovation salle de bain|DEV-/);
    expect(answer.answer).toMatch(/Budget trop élevé/);
  });

  it('répond sur la prestation la plus rentable', async () => {
    const answer = await askAssistant(org.organization.id, org.user.id, 'Quel service me rapporte le plus ?');
    expect(answer.answer).toMatch(/Siphon|Main|prestation/i);
  });

  it('répond sur l’activité réelle, sans parler d’acceptation', async () => {
    // Le produit ne demande aucune validation au client : l'assistant ne doit
    // donc pas répondre en taux d'acceptation, même si la question l'emploie.
    const answer = await askAssistant(
      org.organization.id,
      org.user.id,
      'Quel est mon taux d’acceptation ?',
    );
    expect(answer.answer).toMatch(/devis|chiffré/i);
    expect(answer.answer).not.toMatch(/taux d'acceptation/i);
  });

  it('n’expose jamais les données d’une autre entreprise', async () => {
    const answer = await askAssistant(other.organization.id, other.user.id, 'Quels devis n’ont pas été acceptés ?');
    expect(answer.answer).not.toMatch(/Rénovation salle de bain/);
    expect(answer.facts.join(' ')).not.toMatch(/Rénovation salle de bain/);
  });
});
