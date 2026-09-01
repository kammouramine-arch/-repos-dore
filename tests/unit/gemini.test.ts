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

/**
 * Distinction des pannes.
 *
 * Un modèle inconnu ou une requête mal formée sont des erreurs de
 * configuration : les présenter comme une panne passagère fait attendre un
 * rétablissement qui ne viendra jamais, et masque la seule information utile.
 */
describe('erreurs Gemini distinguées', () => {
  async function echouer(statut: number, corps: unknown) {
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json' } }),
    );
    const erreur = await new GeminiProvider('cle', 'gemini-2.5-flash')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch((e) => e);
    vi.unstubAllGlobals();
    return erreur as { code: string; message: string };
  }

  it('signale l’absence de modèle utilisable quand le repli échoue aussi', async () => {
    const e = await echouer(404, { error: { message: 'models/x is not found' } });
    expect(e.message).toMatch(/aucun modèle/i);
  });

  it('rapporte le motif d’une requête refusée', async () => {
    const e = await echouer(400, { error: { message: 'Invalid JSON payload' } });
    expect(e.message).toContain('Invalid JSON payload');
  });

  it('signale une clé invalide sans la citer', async () => {
    const e = await echouer(403, { error: { message: 'permission denied' } });
    expect(e.message).toMatch(/clé d'API/i);
    expect(e.message).not.toContain('cle');
  });
});

/**
 * Repli automatique de modèle.
 *
 * Un nom de modèle a une durée de vie. Le jour où Google en retire un, DEVISIA
 * ne doit pas retomber en silence sur son moteur local : le fournisseur
 * demande à l'API quels modèles elle sert réellement, et rejoue une fois.
 */
describe('repli de modèle', () => {
  function serveur(disponibles: string[], modelesQuiRepondent: string[]) {
    const appels: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      appels.push(url);
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            models: [
              ...disponibles.map((id) => ({
                name: `models/${id}`,
                supportedGenerationMethods: ['generateContent'],
              })),
              { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      const modele = url.split('/models/')[1]!.split(':')[0]!;
      if (!modelesQuiRepondent.includes(modele)) {
        return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 });
      }
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'bonjour' }] } }],
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    return appels;
  }

  it('bascule sur un modèle réellement servi quand le configuré n’existe plus', async () => {
    const appels = serveur(['gemini-2.0-flash', 'gemini-2.5-pro'], ['gemini-2.0-flash', 'gemini-2.5-pro']);
    const resultat = await new GeminiProvider('cle', 'modele-perime').generateText({
      system: 'c',
      untrusted: 'd',
    });
    vi.unstubAllGlobals();
    expect(resultat.data).toBe('bonjour');
    expect(resultat.usage.model).toBe('gemini-2.0-flash');
    expect(appels.some((u) => u.endsWith('/models'))).toBe(true);
  });

  it('ne consulte pas la liste quand le modèle configuré répond', async () => {
    const appels = serveur(['gemini-2.0-flash'], ['gemini-2.5-flash']);
    await new GeminiProvider('cle', 'gemini-2.5-flash').generateText({ system: 'c', untrusted: 'd' });
    vi.unstubAllGlobals();
    expect(appels.some((u) => u.endsWith('/models'))).toBe(false);
  });

  it('ignore les modèles inaptes à rédiger un devis', async () => {
    serveur(['imagen-3.0', 'gemini-2.0-flash'], ['gemini-2.0-flash']);
    const r = await new GeminiProvider('cle', 'inconnu').generateText({ system: 'c', untrusted: 'd' });
    vi.unstubAllGlobals();
    expect(r.usage.model).toBe('gemini-2.0-flash');
  });
});
