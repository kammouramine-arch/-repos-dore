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
    expect(Object.values(capabilities).every((v) => typeof v === 'boolean')).toBe(true);
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
