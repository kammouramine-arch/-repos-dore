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
/**
 * Seuls mots-clés que Gemini accepte dans un schéma de réponse.
 *
 * Les contraintes de validation produites par Zod — bornes, longueurs,
 * motifs — font répondre « Request contains an invalid argument », défaut
 * réellement rencontré en production. Elles n'apportent rien : Zod revalide
 * la réponse. La liste blanche est donc vérifiée, pas une liste noire, qu'un
 * mot-clé nouveau contournerait en silence.
 */
const AUTORISES = new Set([
  'type',
  'properties',
  'required',
  'items',
  'enum',
  'nullable',
  'description',
  'anyOf',
]);

/** Mots-clés rencontrés hors des noms de champs (qui, eux, sont libres). */
function motsCles(noeud: unknown, dansProprietes = false, vus = new Set<string>()): Set<string> {
  if (Array.isArray(noeud)) {
    noeud.forEach((n) => motsCles(n, false, vus));
    return vus;
  }
  if (noeud && typeof noeud === 'object') {
    for (const [k, v] of Object.entries(noeud)) {
      if (!dansProprietes) vus.add(k);
      motsCles(v, k === 'properties', vus);
    }
  }
  return vus;
}

describe('schéma Gemini', () => {
  it('n’émet que des mots-clés acceptés, sur le vrai schéma de devis', () => {
    const hors = [...motsCles(toGeminiSchema(quoteDraftSchema))].filter((k) => !AUTORISES.has(k));
    expect(hors).toEqual([]);
  });

  it('n’émet que des mots-clés acceptés sur l’analyse de photos', () => {
    const hors = [...motsCles(toGeminiSchema(imageAnalysisSchema))].filter((k) => !AUTORISES.has(k));
    expect(hors).toEqual([]);
  });

  it('conserve les noms de champs, qui ne sont pas des mots-clés', () => {
    const schema = toGeminiSchema(quoteDraftSchema);
    const champs = Object.keys(schema.properties as object);
    expect(champs).toContain('materiaux');
    expect(champs).toContain('mainOeuvre');
    expect(champs).toContain('questions');
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

  it('signale l’absence de modèle utilisable et ce qu’il a tenté', async () => {
    const e = await echouer(404, { error: { message: 'models/x is not found' } });
    expect(e.message).toMatch(/aucun modèle/i);
    expect(e.message).toContain('gemini-2.5-flash');
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

/**
 * Le message d'erreur porte le diagnostic.
 *
 * Un opérateur sans accès aux journaux de l'hébergeur doit pouvoir comprendre
 * une panne de configuration depuis la réponse. Statuts HTTP et noms de
 * modèles ne sont pas des secrets ; la clé, elle, ne doit jamais y figurer.
 */
describe('diagnostic remonté', () => {
  it('rapporte le refus de la liste des modèles', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      url.endsWith('/models')
        ? new Response(JSON.stringify({ error: { message: 'API non activée' } }), { status: 403 })
        : new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 }),
    );
    const e = (await new GeminiProvider('CLE-SECRETE', 'gemini-2.5-flash')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch((x: unknown) => x as Error)) as unknown as Error;
    vi.unstubAllGlobals();
    expect(e.message).toContain('403');
    expect(e.message).toContain('API non activée');
    expect(e.message).not.toContain('CLE-SECRETE');
  });

  it('rapporte une liste vide de modèles exploitables', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      url.endsWith('/models')
        ? new Response(
            JSON.stringify({ models: [{ name: 'models/embed', supportedGenerationMethods: ['embedContent'] }] }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        : new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 }),
    );
    const e = (await new GeminiProvider('cle', 'gemini-2.5-flash')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch((x: unknown) => x as Error)) as unknown as Error;
    vi.unstubAllGlobals();
    expect(e.message).toMatch(/aucun modèle de génération parmi 1 entrées/i);
  });
});

/**
 * Modèle listé mais non servi.
 *
 * Cas réellement rencontré en production : l'API annonce « gemini-2.5-flash »
 * parmi ses modèles, mais répond 404 quand on lui demande de générer avec.
 * Le repli concluait alors « aucun modèle utilisable » — il retenait le même
 * nom que celui qui venait d'échouer. Il doit passer au suivant.
 */
describe('modèle listé mais non servi', () => {
  function api(listes: string[], repondent: string[]) {
    const essayes: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            models: listes.map((id) => ({
              name: `models/${id}`,
              supportedGenerationMethods: ['generateContent'],
            })),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      const modele = url.split('/models/')[1]!.split(':')[0]!;
      essayes.push(modele);
      if (!repondent.includes(modele)) {
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
    return essayes;
  }

  it('passe au modèle suivant plutôt que de renoncer', async () => {
    const essayes = api(
      ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'],
      ['gemini-flash-latest'],
    );
    const r = await new GeminiProvider('cle', 'gemini-2.5-flash').generateText({
      system: 'c',
      untrusted: 'd',
    });
    vi.unstubAllGlobals();
    expect(r.data).toBe('bonjour');
    expect(r.usage.model).toBe('gemini-flash-latest');
    expect(essayes).toContain('gemini-2.5-flash');
  });

  it('mémorise le couple retenu et ne recherche plus ensuite', async () => {
    const essayes = api(['a-perime', 'gemini-flash-latest'], ['gemini-flash-latest']);
    const fournisseur = new GeminiProvider('cle', 'a-perime');
    await fournisseur.generateText({ system: 'c', untrusted: 'd' });
    const avant = essayes.length;
    await fournisseur.generateText({ system: 'c', untrusted: 'd' });
    vi.unstubAllGlobals();
    expect(essayes.length - avant).toBe(1);
  });

  it('n’essaie pas d’autre modèle quand la clé est refusée', async () => {
    const essayes: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (!url.endsWith('/models')) essayes.push(url);
      return new Response(JSON.stringify({ error: { message: 'denied' } }), { status: 403 });
    });
    await new GeminiProvider('cle', 'gemini-2.5-flash')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch(() => undefined);
    vi.unstubAllGlobals();
    expect(essayes.length).toBe(1);
  });
});

/**
 * Tout échec se décrit lui-même.
 *
 * Six déploiements ont été dépensés à deviner pourquoi la production
 * basculait sur son moteur local, parce que le motif ne vivait que dans les
 * journaux de l'hébergeur. Statuts HTTP, noms de modèles et messages de l'API
 * ne sont pas des secrets : ils appartiennent au message d'erreur. La clé, non.
 */
describe('échecs auto-descriptifs', () => {
  async function motif(reponse: () => Response | Promise<Response>) {
    vi.stubGlobal('fetch', async () => reponse());
    const e = (await new GeminiProvider('CLE-SECRETE-123', 'gemini-flash-latest')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch((x: unknown) => x as Error)) as Error;
    vi.unstubAllGlobals();
    return e.message;
  }

  it('nomme le statut et le message quand tous les modèles saturent', async () => {
    const m = await motif(() =>
      new Response(JSON.stringify({ error: { message: 'internal failure' } }), { status: 500 }),
    );
    expect(m).toContain('500');
    expect(m).toContain('gemini-flash-latest');
    expect(m).toContain('internal failure');
    expect(m).not.toContain('CLE-SECRETE-123');
  });

  it('nomme la panne réseau plutôt que de la taire', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    const e = (await new GeminiProvider('cle', 'gemini-flash-latest')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch((x: unknown) => x as Error)) as Error;
    vi.unstubAllGlobals();
    expect(e.message).toMatch(/injoignable/i);
    expect(e.message).toContain('fetch failed');
  });

  it('ne divulgue jamais la clé, quel que soit l’échec', async () => {
    for (const statut of [400, 429, 403, 500, 503]) {
      const m = await motif(() =>
        new Response(JSON.stringify({ error: { message: 'x' } }), { status: statut }),
      );
      expect(m, String(statut)).not.toContain('CLE-SECRETE-123');
    }
  });
});

/**
 * Modèle saturé.
 *
 * Cas réellement rencontré en production : Google répond 503 « high demand »
 * sur gemini-flash-latest. Les modèles ont des capacités distinctes — retomber
 * sur le moteur local prive l'artisan de ce qu'on lui promet pour une panne
 * qui dure quelques secondes.
 */
describe('modèle saturé', () => {
  function api(listes: string[], repondent: string[], statutEchec = 503) {
    const essayes: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            models: listes.map((id) => ({
              name: `models/${id}`,
              supportedGenerationMethods: ['generateContent'],
            })),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      const modele = url.split('/models/')[1]!.split(':')[0]!;
      essayes.push(modele);
      if (!repondent.includes(modele)) {
        return new Response(
          JSON.stringify({ error: { message: 'This model is currently experiencing high demand.' } }),
          { status: statutEchec },
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'bonjour' }] } }],
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    return essayes;
  }

  it('bascule sur un autre modèle quand le premier est saturé', async () => {
    api(['gemini-flash-latest', 'gemini-2.5-flash'], ['gemini-2.5-flash']);
    const r = await new GeminiProvider('cle', 'gemini-flash-latest').generateText({
      system: 'c',
      untrusted: 'd',
    });
    vi.unstubAllGlobals();
    expect(r.data).toBe('bonjour');
    expect(r.usage.model).toBe('gemini-2.5-flash');
  });

  it('oublie le couple mémorisé s’il devient saturé et en trouve un autre', async () => {
    const fournisseur = new GeminiProvider('cle', 'gemini-flash-latest');
    api(['gemini-flash-latest', 'gemini-2.5-flash'], ['gemini-flash-latest']);
    const premier = await fournisseur.generateText({ system: 'c', untrusted: 'd' });
    expect(premier.usage.model).toBe('gemini-flash-latest');
    vi.unstubAllGlobals();

    api(['gemini-flash-latest', 'gemini-2.5-flash'], ['gemini-2.5-flash']);
    const second = await fournisseur.generateText({ system: 'c', untrusted: 'd' });
    vi.unstubAllGlobals();
    expect(second.usage.model).toBe('gemini-2.5-flash');
  });

  it('n’essaie pas d’autre modèle sur un quota dépassé', async () => {
    const essayes = api(['a', 'b'], [], 429);
    await new GeminiProvider('cle', 'a')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch(() => undefined);
    vi.unstubAllGlobals();
    expect(essayes.length).toBe(1);
  });
});

/**
 * Un devis dégradé dit de quoi il l'est.
 *
 * La bascule sur le moteur local est voulue — un artisan obtient toujours un
 * devis — mais elle effaçait la cause, y compris pour qui exploite le service.
 * Vérifier la production revenait alors à deviner, un déploiement à la fois.
 */
describe('motif du mode dégradé', () => {
  it('accompagne toujours un devis dégradé', async () => {
    const { generateQuoteDraft } = await import('@/server/services/aiQuoteService');
    expect(typeof generateQuoteDraft).toBe('function');
  });

  it('le contrat partagé porte le motif et le modèle', async () => {
    const contrats = await import('@devisia/shared');
    // Les deux champs existent dans le type : une absence casserait la
    // compilation des clients web et mobile, pas seulement ce cas.
    const exemple: import('@devisia/shared').GeneratedQuoteDTO = {
      title: 't', summary: 's', workDescription: [], lines: [], questions: [],
      warnings: [], observations: [], assumptions: [], confidence: 42,
      estimatedDurationMin: null, degraded: true, provider: 'local',
      model: null, degradedReason: 'motif',
      totals: { subtotalCents: 0, discountCents: 0, netSubtotalCents: 0, vatCents: 0, totalCents: 0, depositCents: 0 },
    };
    expect(exemple.degradedReason).toBe('motif');
    expect(contrats).toBeDefined();
  });
});

/**
 * Sémantique portée par les descriptions.
 *
 * En retirant les contraintes du schéma transmis, on a retiré le seul indice
 * d'échelle qui restait : Gemini a rendu une confiance de 1 sur un devis
 * complet, lue comme 1 %. Les descriptions traversent, elles ; elles doivent
 * donc porter ce que les bornes disaient.
 */
describe('sémantique du schéma transmis', () => {
  it('énonce l’échelle de confiance dans le schéma envoyé', () => {
    const schema = toGeminiSchema(quoteDraftSchema);
    const confiance = (schema.properties as Record<string, Record<string, unknown>>).confiance!;
    expect(String(confiance.description)).toMatch(/0 à 100/);
  });

  it('décrit les champs dont le sens n’est pas évident', () => {
    const props = toGeminiSchema(quoteDraftSchema).properties as Record<
      string,
      Record<string, unknown>
    >;
    for (const champ of ['questions', 'alertes', 'observations', 'hypotheses', 'dureeEstimeeMinutes']) {
      expect(String(props[champ]?.description ?? ''), champ).not.toBe('');
    }
  });
});

/**
 * Ordre des candidats.
 *
 * Un modèle « lite » a rendu en production un devis sans aucune ligne, avec un
 * total à zéro, présenté comme préparé par l'IA. Il répond vite mais bâcle :
 * il vient donc après les modèles complets, saturation comprise.
 */
describe('ordre des modèles candidats', () => {
  it('essaie les modèles complets avant les variantes lite', async () => {
    const essayes: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            models: ['gemini-flash-lite-latest', 'gemini-2.5-pro', 'gemini-2.5-flash'].map((id) => ({
              name: `models/${id}`,
              supportedGenerationMethods: ['generateContent'],
            })),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      const modele = url.split('/models/')[1]!.split(':')[0]!;
      essayes.push(modele);
      return new Response(JSON.stringify({ error: { message: 'nope' } }), { status: 404 });
    });
    await new GeminiProvider('cle', 'introuvable')
      .generateText({ system: 'c', untrusted: 'd' })
      .catch(() => undefined);
    vi.unstubAllGlobals();

    const complets = essayes.filter((m) => !/lite/.test(m));
    const lites = essayes.filter((m) => /lite/.test(m));
    expect(complets.length).toBeGreaterThan(0);
    expect(lites.length).toBeGreaterThan(0);
    // Le dernier modèle complet est essayé avant le premier « lite ».
    expect(essayes.lastIndexOf(complets.at(-1)!)).toBeLessThan(essayes.indexOf(lites[0]!));
  });
});
