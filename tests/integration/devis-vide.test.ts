import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanupOrganization, createTestOrganization } from '../helpers';

/**
 * Devis vide rendu par l'IA.
 *
 * Constaté en production : un modèle rapide n'a renvoyé qu'un titre et un
 * résumé. Le schéma l'autorise — les tableaux ont une valeur par défaut — et
 * l'artisan a reçu un devis à 0,00 € présenté comme préparé par l'IA, sans
 * mode dégradé ni avertissement. C'est pire que le repli : un total faux
 * portant les habits de la fiabilité.
 */
let org: Awaited<ReturnType<typeof createTestOrganization>>;

beforeAll(async () => {
  org = await createTestOrganization('Plomberie Vide');
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id);
  vi.resetModules();
});

/** Charge le service avec un fournisseur d'IA dont on choisit la réponse. */
async function avecReponseIA(data: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock('@/lib/ai', async () => {
    const reel = await vi.importActual<typeof import('@/lib/ai')>('@/lib/ai');
    return {
      ...reel,
      getAIProvider: () => ({
        name: 'gemini' as const,
        available: true,
        generateStructuredOutput: async () => ({
          data,
          degraded: false,
          usage: { latencyMs: 10, provider: 'gemini' as const, model: 'gemini-2.5-flash' },
        }),
        generateText: async () => {
          throw new Error('non utilisé');
        },
        analyzeImage: async () => {
          throw new Error('non utilisé');
        },
      }),
    };
  });
  const { generateQuoteDraft } = await import('@/server/services/aiQuoteService');
  const resultat = await generateQuoteDraft({
    organizationId: org.organization.id,
    userId: org.user.id,
    description:
      "Remplacement d'un chauffe-eau 200 litres, dépose de l'ancien, deux heures sur place.",
    fileIds: [],
  });
  vi.doUnmock('@/lib/ai');
  return resultat;
}

const VIDE = {
  titre: 'Remplacement chauffe-eau',
  resume: 'Dépose et pose.',
  descriptionTravaux: [],
  materiaux: [],
  mainOeuvre: [],
  questions: [],
  alertes: [],
  observations: [],
  hypotheses: [],
  dureeEstimeeMinutes: null,
  confiance: 80,
};

describe('devis sans lignes rendu par l’IA', () => {
  it('est refusé et bascule sur le moteur local', async () => {
    const devis = await avecReponseIA(VIDE);
    expect(devis.degraded).toBe(true);
    expect(devis.provider).toBe('local');
    expect(devis.model).toBeNull();
  });

  it('dit pourquoi il a basculé', async () => {
    const devis = await avecReponseIA(VIDE);
    expect(devis.degradedReason ?? '').toMatch(/aucune ligne/i);
  });

  it('rend malgré tout un devis chiffré, jamais un total à zéro', async () => {
    const devis = await avecReponseIA(VIDE);
    expect(devis.lines.length).toBeGreaterThan(0);
    expect(devis.totals.totalCents).toBeGreaterThan(0);
  });

  it('accepte un devis qui porte au moins une ligne', async () => {
    const devis = await avecReponseIA({
      ...VIDE,
      mainOeuvre: [{ designation: 'Main-d’œuvre plombier', heures: 2, tauxHoraire: 55 }],
    });
    expect(devis.degraded).toBe(false);
    expect(devis.provider).toBe('gemini');
    expect(devis.model).toBe('gemini-2.5-flash');
    expect(devis.lines.length).toBeGreaterThan(0);
  });
});

/**
 * Jetons consommés.
 *
 * Sans cette mesure, le coût par artisan ne peut être qu'estimé. Les jetons de
 * raisonnement comptent : les modèles qui réfléchissent avant de répondre les
 * facturent à part, et les ignorer sous-estime la note.
 */
describe('jetons consommés', () => {
  it('sont exposés quand l’IA a répondu', async () => {
    const devis = await avecReponseIA({
      ...VIDE,
      mainOeuvre: [{ designation: 'Main-d’œuvre', heures: 2, tauxHoraire: 55 }],
    });
    expect(devis.degraded).toBe(false);
    expect(devis.usage).not.toBeNull();
    expect(devis.usage!.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('sont nuls en mode dégradé : rien n’a été consommé', async () => {
    const devis = await avecReponseIA(VIDE);
    expect(devis.degraded).toBe(true);
    expect(devis.usage).toBeNull();
  });
});
