import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildHeuristicQuoteDraft } from '@/lib/ai/heuristic';

/**
 * Détection de `ANTHROPIC_API_KEY` au runtime.
 *
 * Les modules `env` et `ai` mettent leur configuration en cache : chaque cas
 * recharge donc les modules pour observer un démarrage propre, exactement comme
 * un serveur qui boote avec un environnement donné.
 */
async function loadWith(vars: Record<string, string | undefined>) {
  vi.resetModules();
  const previous = { ...process.env };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const env = await import('@/lib/env');
  const ai = await import('@/lib/ai');
  return { env, ai, restore: () => Object.assign(process.env, previous) };
}

const BASE = {
  ANTHROPIC_API_KEY: undefined,
  AI_PROVIDER: undefined,
  ANTHROPIC_MODEL: undefined,
} satisfies Record<string, string | undefined>;

let restore: (() => void) | undefined;

beforeEach(() => {
  restore = undefined;
});

afterEach(() => {
  restore?.();
  vi.resetModules();
});

describe('détection de ANTHROPIC_API_KEY', () => {
  it('reste sur le moteur local sans clé', async () => {
    const loaded = await loadWith(BASE);
    restore = loaded.restore;
    expect(loaded.env.aiProviderKind()).toBe('local');
    expect(loaded.ai.getAIProvider()).toBeNull();
    expect(loaded.ai.aiCapabilities().generation).toBe(false);
  });

  it('active Claude dès que la clé existe, sans autre variable', async () => {
    const loaded = await loadWith({ ...BASE, ANTHROPIC_API_KEY: 'sk-ant-test-cle-factice' });
    restore = loaded.restore;
    expect(loaded.env.aiProviderKind()).toBe('anthropic');
    const provider = loaded.ai.getAIProvider();
    expect(provider).not.toBeNull();
    expect(provider?.name).toBe('anthropic');
    expect(loaded.ai.aiCapabilities().generation).toBe(true);
  });

  it('traite une clé vide comme une absence de clé', async () => {
    const loaded = await loadWith({ ...BASE, ANTHROPIC_API_KEY: '   ' });
    restore = loaded.restore;
    expect(loaded.env.aiProviderKind()).toBe('local');
    expect(loaded.ai.getAIProvider()).toBeNull();
  });

  it('respecte le forçage explicite AI_PROVIDER=local malgré une clé', async () => {
    const loaded = await loadWith({
      ...BASE,
      ANTHROPIC_API_KEY: 'sk-ant-test-cle-factice',
      AI_PROVIDER: 'local',
    });
    restore = loaded.restore;
    expect(loaded.env.aiProviderKind()).toBe('local');
    expect(loaded.ai.getAIProvider()).toBeNull();
  });

  it('retombe sur le moteur local si AI_PROVIDER=anthropic sans clé', async () => {
    const loaded = await loadWith({ ...BASE, AI_PROVIDER: 'anthropic' });
    restore = loaded.restore;
    expect(loaded.env.aiProviderKind()).toBe('anthropic');
    expect(loaded.ai.getAIProvider()).toBeNull();
    expect(loaded.ai.aiCapabilities().generation).toBe(false);
  });

  it('utilise claude-opus-5 par défaut et respecte ANTHROPIC_MODEL', async () => {
    const parDefaut = await loadWith({ ...BASE, ANTHROPIC_API_KEY: 'sk-ant-test-cle-factice' });
    expect(parDefaut.env.env().ANTHROPIC_MODEL).toBe('claude-opus-5');
    parDefaut.restore();

    const choisi = await loadWith({
      ...BASE,
      ANTHROPIC_API_KEY: 'sk-ant-test-cle-factice',
      ANTHROPIC_MODEL: 'claude-sonnet-5',
    });
    restore = choisi.restore;
    expect(choisi.env.env().ANTHROPIC_MODEL).toBe('claude-sonnet-5');
  });
});

describe('confinement du secret', () => {
  it("n'expose aucune clé Anthropic via les capacités transmises à l'interface", async () => {
    const loaded = await loadWith({ ...BASE, ANTHROPIC_API_KEY: 'sk-ant-secret-a-ne-pas-fuiter' });
    restore = loaded.restore;
    const capabilities = loaded.ai.aiCapabilities();
    expect(JSON.stringify(capabilities)).not.toContain('sk-ant');
    // Les capacités ne portent que des drapeaux et le nom du fournisseur :
    // aucune valeur libre où une clé pourrait se glisser.
    const { provider, ...drapeaux } = capabilities;
    expect(Object.values(drapeaux).every((v) => typeof v === 'boolean')).toBe(true);
    expect(['gemini', 'anthropic', 'local']).toContain(provider);
  });
});

/**
 * Objet du devis produit sans fournisseur IA.
 *
 * L'objet reprenait la première phrase entière : une description dictée d'un
 * seul trait donnait un titre aussi long que le devis, répété juste en dessous
 * par le résumé, et rogné à l'écran.
 */
describe('objet du devis', () => {
  const base = { catalog: [], hourlyRateCents: 4500, defaultVatRate: 20, trade: 'PLOMBIER' };

  it('reste un titre, pas la description entière', () => {
    const draft = buildHeuristicQuoteDraft({
      ...base,
      description:
        "Remplacement d'un chauffe-eau 200 litres, deux heures sur place, evacuation de l'ancien et remise en service.",
    });
    expect(draft.titre.length).toBeLessThanOrEqual(63);
    expect(draft.titre.length).toBeGreaterThan(8);
    expect(draft.titre.length).toBeLessThan(draft.resume.length);
  });

  it('coupe sur un mot entier', () => {
    const draft = buildHeuristicQuoteDraft({
      ...base,
      description:
        'Renovation complete de la salle de bain avec depose du carrelage existant pose de faience murale et installation dune douche italienne',
    });
    expect(draft.titre.endsWith('…')).toBe(true);
    // Le caractère avant les points de suspension termine un mot, il n'est
    // donc pas suivi d'un fragment : le titre entier existe dans le résumé.
    expect(draft.resume.toLowerCase()).toContain(draft.titre.replace('…', '').toLowerCase());
  });

  it('nomme le métier quand la description est trop courte pour un titre', () => {
    const draft = buildHeuristicQuoteDraft({ ...base, description: 'fuite' });
    expect(draft.titre).toMatch(/Intervention/i);
  });
});

/**
 * Forme de la requête envoyée à Claude.
 *
 * Les modèles récents rejettent `temperature` par un 400. Le garde existe,
 * mais rien ne le vérifiait : un modèle rangé par erreur parmi les anciens,
 * ou un garde supprimé, aurait fait échouer chaque appel en production sans
 * que rien ne le signale — la bascule sur le moteur local rend toujours un
 * devis. Ces cas figent la forme réellement envoyée, sans appeler l'API.
 */
describe('forme de la requête Claude', () => {
  async function requetePour(model: string) {
    vi.resetModules();
    const capturees: Record<string, unknown>[] = [];
    vi.doMock('@anthropic-ai/sdk', () => {
      class FauxAnthropic {
        messages = {
          create: async (body: Record<string, unknown>) => {
            capturees.push(body);
            return {
              content: [{ type: 'tool_use', name: 'essai', input: { texte: 'ok' } }],
              usage: { input_tokens: 10, output_tokens: 5 },
            };
          },
        };
      }
      return { default: FauxAnthropic, APIError: class extends Error {} };
    });

    const { AnthropicProvider } = await import('@/lib/ai/anthropic');
    const { z } = await import('zod');
    await new AnthropicProvider('cle-de-test', model).generateStructuredOutput({
      system: 'consigne',
      untrusted: 'description',
      schema: z.object({ texte: z.string() }),
      schemaName: 'essai',
    });
    vi.doUnmock('@anthropic-ai/sdk');
    return capturees[0]!;
  }

  it('n’envoie pas temperature aux modèles qui la rejettent', async () => {
    for (const model of ['claude-opus-5', 'claude-sonnet-5', 'claude-opus-4-6']) {
      expect((await requetePour(model)).temperature, model).toBeUndefined();
    }
  });

  it('l’envoie encore aux modèles antérieurs qui l’acceptent', async () => {
    for (const model of ['claude-3-5-sonnet-20241022', 'claude-opus-4-1']) {
      expect((await requetePour(model)).temperature, model).toBeDefined();
    }
  });

  it('demande une sortie structurée par appel d’outil', async () => {
    const requete = await requetePour('claude-opus-5');
    expect(requete.tool_choice).toEqual({ type: 'tool', name: 'essai' });
    expect(Array.isArray(requete.tools)).toBe(true);
  });
});

/**
 * Choix du fournisseur.
 *
 * Gemini passe devant : c'est le fournisseur retenu pour la production. Poser
 * une clé Anthropic doit continuer à suffire pour y revenir, et `AI_PROVIDER`
 * reste le dernier mot — sans quoi on ne pourrait pas forcer le moteur local.
 */
describe('choix du fournisseur', () => {
  it('retient Gemini dès que sa clé est présente', async () => {
    const { env, ai, restore } = await loadWith({
      GEMINI_API_KEY: 'cle-gemini',
      ANTHROPIC_API_KEY: undefined,
      AI_PROVIDER: undefined,
    });
    expect(env.aiProviderKind()).toBe('gemini');
    expect(ai.getAIProvider()?.name).toBe('gemini');
    restore();
  });

  it('préfère Gemini à Anthropic quand les deux clés existent', async () => {
    const { env, restore } = await loadWith({
      GEMINI_API_KEY: 'cle-gemini',
      ANTHROPIC_API_KEY: 'cle-anthropic',
      AI_PROVIDER: undefined,
    });
    expect(env.aiProviderKind()).toBe('gemini');
    restore();
  });

  it('revient à Anthropic si seule sa clé est posée', async () => {
    const { env, restore } = await loadWith({
      GEMINI_API_KEY: undefined,
      ANTHROPIC_API_KEY: 'cle-anthropic',
      AI_PROVIDER: undefined,
    });
    expect(env.aiProviderKind()).toBe('anthropic');
    restore();
  });

  it('laisse AI_PROVIDER trancher, même avec une clé Gemini', async () => {
    const { env, ai, restore } = await loadWith({
      GEMINI_API_KEY: 'cle-gemini',
      AI_PROVIDER: 'local',
    });
    expect(env.aiProviderKind()).toBe('local');
    expect(ai.getAIProvider()).toBeNull();
    restore();
  });

  it('sans aucune clé, le moteur local prend la main', async () => {
    const { env, ai, restore } = await loadWith({
      GEMINI_API_KEY: undefined,
      ANTHROPIC_API_KEY: undefined,
      AI_PROVIDER: undefined,
    });
    expect(env.aiProviderKind()).toBe('local');
    expect(ai.getAIProvider()).toBeNull();
    restore();
  });
});

/**
 * Fournisseur annoncé par les capacités.
 *
 * `generation: true` dit seulement qu'une clé existe. Deux fois de suite, une
 * production dégradée s'est révélée indiscernable d'un déploiement qui n'était
 * pas encore parti : le nom du fournisseur actif lève l'ambiguïté sans rien
 * divulguer.
 */
describe('fournisseur annoncé', () => {
  it('nomme Gemini quand c’est lui qui sert', async () => {
    const { ai, restore } = await loadWith({
      GEMINI_API_KEY: 'cle-gemini',
      ANTHROPIC_API_KEY: undefined,
      AI_PROVIDER: undefined,
    });
    expect(ai.aiCapabilities().provider).toBe('gemini');
    restore();
  });

  it('nomme le moteur local quand aucune clé n’est posée', async () => {
    const { ai, restore } = await loadWith({
      GEMINI_API_KEY: undefined,
      ANTHROPIC_API_KEY: undefined,
      AI_PROVIDER: undefined,
    });
    const capacites = ai.aiCapabilities();
    expect(capacites.provider).toBe('local');
    expect(capacites.generation).toBe(false);
    restore();
  });

  it('ne divulgue jamais la clé elle-même', async () => {
    const { ai, restore } = await loadWith({ GEMINI_API_KEY: 'CLE-SECRETE-123' });
    expect(JSON.stringify(ai.aiCapabilities())).not.toContain('CLE-SECRETE-123');
    restore();
  });
});
