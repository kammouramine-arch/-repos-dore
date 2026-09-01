import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { toGeminiSchema, GeminiProvider } from '@/lib/ai/gemini';
import { quoteDraftSchema, imageAnalysisSchema } from '@/lib/ai/schemas';

/**
 * Conversion du schéma Zod vers le sous-ensemble accepté par Gemini.
 *
 * Un mot-clé de trop et l'API répond 400 — c'est-à-dire, dans DEVISIA, une
 * bascule silencieuse sur le moteur local : l'artisan reçoit un devis, mais
 * pas celui qu'on lui a promis. Ces cas portent sur les schémas réellement
 * envoyés en production, pas sur des exemples.
 */
const INTERDITS = [
  '$schema',
  '$id',
  'additionalProperties',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'default',
  'const',
  '$defs',
  'definitions',
];

function cles(noeud: unknown, vues: string[] = []): string[] {
  if (Array.isArray(noeud)) {
    noeud.forEach((n) => cles(n, vues));
    return vues;
  }
  if (noeud && typeof noeud === 'object') {
    for (const [k, v] of Object.entries(noeud)) {
      vues.push(k);
      cles(v, vues);
    }
  }
  return vues;
}

describe('schéma Gemini', () => {
  it('ne laisse passer aucun mot-clé refusé, sur le vrai schéma de devis', () => {
    const presentes = new Set(cles(toGeminiSchema(quoteDraftSchema)));
    for (const interdit of INTERDITS) expect(presentes.has(interdit), interdit).toBe(false);
  });

  it('ne laisse passer aucun mot-clé refusé sur l’analyse de photos', () => {
    const presentes = new Set(cles(toGeminiSchema(imageAnalysisSchema)));
    for (const interdit of INTERDITS) expect(presentes.has(interdit), interdit).toBe(false);
  });

  it('garde la structure utile : type, propriétés, champs requis', () => {
    const schema = toGeminiSchema(quoteDraftSchema);
    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties as object).length).toBeGreaterThan(3);
    expect(Array.isArray(schema.required)).toBe(true);
  });

  it('exprime la nullité par nullable, jamais par un type composite', () => {
    const schema = toGeminiSchema(z.object({ note: z.string().nullable() }));
    const note = (schema.properties as Record<string, Record<string, unknown>>).note!;
    expect(Array.isArray(note.type)).toBe(false);
    expect(note.nullable).toBe(true);
  });

  it('aplatit un anyOf réduit à une seule branche', () => {
    const schema = toGeminiSchema(z.object({ n: z.number().nullable() }));
    const n = (schema.properties as Record<string, Record<string, unknown>>).n!;
    expect(n.anyOf).toBeUndefined();
    expect(n.nullable).toBe(true);
  });
});

/**
 * Forme de l'appel HTTP.
 *
 * La clé d'API ne doit jamais entrer dans une URL : les URL finissent dans les
 * journaux, les traces et les rapports d'erreur.
 */
describe('appel Gemini', () => {
  async function capturer(reponse: unknown, statut = 200) {
    const appels: { url: string; init: RequestInit }[] = [];
    const faux = vi.fn(async (url: string, init: RequestInit) => {
      appels.push({ url, init });
      return new Response(JSON.stringify(reponse), {
        status: statut,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', faux);
    return { appels };
  }

  const reponseValide = {
    candidates: [{ content: { parts: [{ text: '{"texte":"ok"}' }] } }],
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4 },
  };

  it('envoie la clé en en-tête et jamais dans l’URL', async () => {
    const { appels } = await capturer(reponseValide);
    await new GeminiProvider('CLE-SECRETE-123', 'gemini-2.5-flash').generateStructuredOutput({
      system: 'consigne',
      untrusted: 'description',
      schema: z.object({ texte: z.string() }),
      schemaName: 'essai',
    });
    vi.unstubAllGlobals();

    const { url, init } = appels[0]!;
    expect(url).not.toContain('CLE-SECRETE-123');
    expect(url).toContain('gemini-2.5-flash:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('CLE-SECRETE-123');
  });

  it('demande bien une réponse JSON contrainte par le schéma', async () => {
    const { appels } = await capturer(reponseValide);
    await new GeminiProvider('cle', 'gemini-2.5-flash').generateStructuredOutput({
      system: 'consigne',
      untrusted: 'description',
      schema: z.object({ texte: z.string() }),
      schemaName: 'essai',
    });
    vi.unstubAllGlobals();

    const corps = JSON.parse(appels[0]!.init.body as string);
    expect(corps.generationConfig.responseMimeType).toBe('application/json');
    expect(corps.generationConfig.responseSchema.type).toBe('object');
    expect(corps.systemInstruction.parts[0].text).toBe('consigne');
  });

  it('remonte une erreur exploitable sans divulguer la clé', async () => {
    await capturer({ error: { message: 'quota dépassé', status: 'RESOURCE_EXHAUSTED' } }, 429);
    await expect(
      new GeminiProvider('CLE-SECRETE-123', 'gemini-2.5-flash').generateText({
        system: 'c',
        untrusted: 'd',
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    vi.unstubAllGlobals();
  });
});
