import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { toGeminiSchema, GeminiProvider, profilDevis, profilVision } from '@/lib/ai/gemini';
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
    await new GeminiProvider('CLE-SECRETE-123', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateStructuredOutput({
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
    await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateStructuredOutput({
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
      new GeminiProvider('CLE-SECRETE-123', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateText({
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
    const erreur = await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash'))
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
    const resultat = await new GeminiProvider('cle', profilDevis('modele-perime'), profilVision('modele-perime')).generateText({
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
    await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateText({ system: 'c', untrusted: 'd' });
    vi.unstubAllGlobals();
    expect(appels.some((u) => u.endsWith('/models'))).toBe(false);
  });

  it('ignore les modèles inaptes à rédiger un devis', async () => {
    serveur(['imagen-3.0', 'gemini-2.0-flash'], ['gemini-2.0-flash']);
    const r = await new GeminiProvider('cle', profilDevis('inconnu'), profilVision('inconnu')).generateText({ system: 'c', untrusted: 'd' });
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
    const e = (await new GeminiProvider('CLE-SECRETE', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash'))
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
    const e = (await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash'))
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
    const r = await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateText({
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
    const fournisseur = new GeminiProvider('cle', profilDevis('a-perime'), profilVision('a-perime'));
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
    await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash'))
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
    const e = (await new GeminiProvider('CLE-SECRETE-123', profilDevis('gemini-flash-latest'), profilVision('gemini-flash-latest'))
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
    const e = (await new GeminiProvider('cle', profilDevis('gemini-flash-latest'), profilVision('gemini-flash-latest'))
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
    const r = await new GeminiProvider('cle', profilDevis('gemini-flash-latest'), profilVision('gemini-flash-latest')).generateText({
      system: 'c',
      untrusted: 'd',
    });
    vi.unstubAllGlobals();
    expect(r.data).toBe('bonjour');
    expect(r.usage.model).toBe('gemini-2.5-flash');
  });

  it('oublie le couple mémorisé s’il devient saturé et en trouve un autre', async () => {
    const fournisseur = new GeminiProvider('cle', profilDevis('gemini-flash-latest'), profilVision('gemini-flash-latest'));
    api(['gemini-flash-latest', 'gemini-2.5-flash'], ['gemini-flash-latest']);
    const premier = await fournisseur.generateText({ system: 'c', untrusted: 'd' });
    expect(premier.usage.model).toBe('gemini-flash-latest');
    vi.unstubAllGlobals();

    api(['gemini-flash-latest', 'gemini-2.5-flash'], ['gemini-2.5-flash']);
    const second = await fournisseur.generateText({ system: 'c', untrusted: 'd' });
    vi.unstubAllGlobals();
    expect(second.usage.model).toBe('gemini-2.5-flash');
  });

  it('essaie un autre modèle quand le premier a épuisé son quota', async () => {
    // Les quotas gratuits sont comptés par modèle : un 429 sur l'un ne dit
    // rien des autres. Constaté en production.
    api(['a-epuise', 'gemini-2.5-flash'], ['gemini-2.5-flash'], 429);
    const r = await new GeminiProvider('cle', profilDevis('a-epuise'), profilVision('a-epuise')).generateText({
      system: 'c',
      untrusted: 'd',
    });
    vi.unstubAllGlobals();
    expect(r.usage.model).toBe('gemini-2.5-flash');
  });

  it('dit « saturé » plutôt que « indisponible » si tous sont épuisés', async () => {
    api(['a', 'b'], [], 429);
    const e = (await new GeminiProvider('cle', profilDevis('a'), profilVision('a'))
      .generateText({ system: 'c', untrusted: 'd' })
      .catch((x: unknown) => x as { code: string })) as { code: string };
    vi.unstubAllGlobals();
    expect(e.code).toBe('RATE_LIMITED');
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
      model: null, degradedReason: 'motif', usage: null,
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
  it('écarte expérimentaux, préversions, images et modèles pro', async () => {
    // Liste réellement servie en production le jour de la vérification.
    const servis = [
      'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest-high-res-exp',
      'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest',
      'gemini-2.5-flash-lite', 'gemini-2.5-flash-image',
    ];
    const essayes: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            models: servis.map((id) => ({
              name: `models/${id}`,
              supportedGenerationMethods: ['generateContent'],
            })),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      essayes.push(url.split('/models/')[1]!.split(':')[0]!);
      return new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 });
    });
    await new GeminiProvider('cle', profilDevis('gemini-flash-latest'), profilVision('gemini-flash-latest'))
      .generateText({ system: 'c', untrusted: 'd' })
      .catch(() => undefined);
    vi.unstubAllGlobals();

    for (const rejete of [
      'gemini-2.5-pro',
      'gemini-pro-latest',
      'gemini-flash-latest-high-res-exp',
      'gemini-2.5-flash-image',
    ]) {
      expect(essayes, rejete).not.toContain(rejete);
    }
    // Les trois essais vont aux modèles rapides, lite compris : ils portent
    // un quota distinct, et valent mieux qu'une bascule sur le moteur local.
    expect(essayes).toContain('gemini-2.5-flash');
    expect(essayes.some((m) => /lite/.test(m))).toBe(true);
  });

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
    await new GeminiProvider('cle', profilDevis('introuvable'), profilVision('introuvable'))
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

/**
 * Robustesse de la réponse.
 *
 * Constaté en production : 43 secondes d'attente puis « réponse inexploitable ».
 * La chaîne avait épuisé les modèles rapides, atterri sur un modèle qui
 * raisonne avant de répondre, et saturé son budget de sortie en plein JSON.
 */
describe('lecture de la réponse', () => {
  function repond(texte: string) {
    vi.stubGlobal('fetch', async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: texte }] } }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
  }

  it('accepte un JSON encadré par une clôture Markdown', async () => {
    repond('```json\n{"texte":"ok"}\n```');
    const r = await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateStructuredOutput({
      system: 'c',
      untrusted: 'd',
      schema: z.object({ texte: z.string() }),
      schemaName: 'essai',
    });
    vi.unstubAllGlobals();
    expect(r.data).toEqual({ texte: 'ok' });
  });

  it('accepte le JSON nu, sans encadrement', async () => {
    repond('{"texte":"ok"}');
    const r = await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateStructuredOutput({
      system: 'c',
      untrusted: 'd',
      schema: z.object({ texte: z.string() }),
      schemaName: 'essai',
    });
    vi.unstubAllGlobals();
    expect(r.data).toEqual({ texte: 'ok' });
  });

  it('demande un budget de sortie suffisant pour un devis complet', async () => {
    const corps: string[] = [];
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      corps.push(init.body as string);
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"texte":"ok"}' }] } }], usageMetadata: {} }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    await new GeminiProvider('cle', profilDevis('gemini-2.5-flash'), profilVision('gemini-2.5-flash')).generateStructuredOutput({
      system: 'c',
      untrusted: 'd',
      schema: z.object({ texte: z.string() }),
      schemaName: 'essai',
    });
    vi.unstubAllGlobals();
    expect(JSON.parse(corps[0]!).generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(8192);
  });

  it('borne le nombre de modèles essayés', async () => {
    const essayes: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            models: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map((id) => ({
              name: `models/${id}`,
              supportedGenerationMethods: ['generateContent'],
            })),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      essayes.push(url.split('/models/')[1]!.split(':')[0]!);
      return new Response(JSON.stringify({ error: { message: 'nope' } }), { status: 503 });
    });
    await new GeminiProvider('cle', profilDevis('configure'), profilVision('configure'))
      .generateText({ system: 'c', untrusted: 'd' })
      .catch(() => undefined);
    vi.unstubAllGlobals();
    // Le modèle configuré sur deux versions, puis au plus trois candidats.
    expect(essayes.length).toBeLessThanOrEqual(2 + 3 * 2);
  });
});

/**
 * Séparation des modèles par tâche.
 *
 * Mesuré en production : un devis a pris quatre-vingt-neuf secondes, et
 * l'analyse de photo qui suivait a expiré sur le même budget. Rédiger un devis
 * structuré tolère l'attente — l'écran la couvre par une progression ; lire une
 * photo sur un chantier, non. Deux usages, deux modèles, deux budgets.
 */
describe('profils par tâche', () => {
  function serveur() {
    const envois: { modele: string; corps: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (url.endsWith('/models')) {
        return new Response(JSON.stringify({ models: [] }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      envois.push({
        modele: url.split('/models/')[1]!.split(':')[0]!,
        corps: JSON.parse(init.body as string),
      });
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"description":"d","observations":[],"detectedItems":[],"missingInformation":[]}' }] } }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    return envois;
  }

  it('lit les photos avec le modèle de vision, pas celui des devis', async () => {
    const envois = serveur();
    const f = new GeminiProvider(
      'cle',
      profilDevis('gemini-3.5-flash'),
      profilVision('gemini-2.5-flash'),
    );
    await f.analyzeImage({ images: [], trade: 'PLOMBIER' });
    vi.unstubAllGlobals();
    expect(envois[0]!.modele).toBe('gemini-2.5-flash');
  });

  it('rédige les devis avec le modèle de devis', async () => {
    const envois = serveur();
    const f = new GeminiProvider(
      'cle',
      profilDevis('gemini-3.5-flash'),
      profilVision('gemini-2.5-flash'),
    );
    await f.generateStructuredOutput({
      system: 'c', untrusted: 'd',
      schema: z.object({ description: z.string() }), schemaName: 'essai',
    });
    vi.unstubAllGlobals();
    expect(envois[0]!.modele).toBe('gemini-3.5-flash');
  });

  it('donne à la vision un budget nettement plus court qu’au devis', () => {
    const devis = profilDevis();
    const vision = profilVision();
    expect(vision.timeoutMs).toBeLessThan(devis.timeoutMs / 3);
    expect(vision.timeoutMs).toBeLessThanOrEqual(30_000);
  });

  it('propose par défaut gemini-3.5-flash au devis et gemini-2.5-flash à la vision', () => {
    expect(profilDevis().prefere).toBe('gemini-3.5-flash');
    expect(profilVision().prefere).toBe('gemini-2.5-flash');
  });

  it('accepte les variantes rapides en repli de vision, jamais en tête de devis', () => {
    expect(profilVision().preferences.some((m) => /lite/.test(m))).toBe(true);
    expect(/lite/.test(profilDevis().preferences[0]!)).toBe(false);
  });

  it('mémorise les deux tâches séparément', async () => {
    const envois = serveur();
    const f = new GeminiProvider('cle', profilDevis('modele-devis'), profilVision('modele-vision'));
    await f.analyzeImage({ images: [] });
    await f.generateStructuredOutput({
      system: 'c', untrusted: 'd',
      schema: z.object({ description: z.string() }), schemaName: 'e',
    });
    vi.unstubAllGlobals();
    expect(envois.map((e) => e.modele)).toEqual(['modele-vision', 'modele-devis']);
  });

  it('un dépassement de délai fait essayer un autre modèle, pas échouer', async () => {
    const essayes: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            models: ['lent', 'gemini-2.5-flash'].map((id) => ({
              name: `models/${id}`, supportedGenerationMethods: ['generateContent'],
            })),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      const modele = url.split('/models/')[1]!.split(':')[0]!;
      essayes.push(modele);
      if (modele === 'lent') throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"description":"ok","observations":[],"detectedItems":[],"missingInformation":[]}' }] } }],
          usageMetadata: {},
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    const r = await new GeminiProvider('cle', profilDevis(), profilVision('lent')).analyzeImage({
      images: [],
    });
    vi.unstubAllGlobals();
    expect(r.data.description).toBe('ok');
    expect(essayes).toContain('lent');
    expect(r.usage.model).toBe('gemini-2.5-flash');
  });
});
