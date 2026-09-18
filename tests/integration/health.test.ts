import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';
import { resetEnv } from '@/lib/env';
import { resetEmailProvider } from '@/lib/email';

/**
 * La sonde de santé nomme ce qui va et ce qui ne va pas.
 *
 * En production, la version précédente répondait « database: unavailable » en
 * une milliseconde alors que la base répondait : une variable d'environnement
 * invalide faisait lever `env()` dans le même `try`. La sonde distingue
 * maintenant configuration, base et fournisseurs, et une variable optionnelle
 * mal saisie ne coupe ni la sonde ni le service.
 */
async function probe() {
  const response = await GET();
  return { status: response.status, body: (await response.json()) as { status: string; checks: Record<string, { status?: string; ignored?: string[]; missing?: string[] }> } };
}

describe('sonde de santé', () => {
  afterEach(() => {
    delete process.env.EMAIL_REPLY_TO;
    resetEnv();
    resetEmailProvider();
  });

  it('répond 200 avec la base joignable et chaque composant nommé', async () => {
    const { status, body } = await probe();
    expect(status).toBe(200);
    expect(body.checks.database?.status).toBe('ok');
    expect(body.checks.configuration?.status).toBe('ok');
    expect(body.checks.email).toBeDefined();
    expect(body.checks.ai).toBeDefined();
  });

  it('reste 200 et nomme la variable ignorée quand un réglage optionnel est invalide', async () => {
    process.env.EMAIL_REPLY_TO = 'contact devisera';
    resetEnv();
    resetEmailProvider();
    const { status, body } = await probe();
    expect(status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.checks.configuration?.status).toBe('degraded');
    expect(body.checks.configuration?.ignored).toEqual(['EMAIL_REPLY_TO']);
    expect(body.checks.database?.status).toBe('ok');
    // La valeur fautive n'apparaît nulle part.
    expect(JSON.stringify(body)).not.toContain('contact devisera');
  });
});
