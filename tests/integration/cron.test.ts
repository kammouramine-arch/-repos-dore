import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Tâche planifiée des relances.
 *
 * Vercel déclenche ses tâches planifiées par une requête **GET** sur l'URL de
 * production ; les ordonnanceurs externes et les appels manuels utilisent POST.
 * Les deux méthodes doivent appliquer le même contrôle d'accès et rendre le
 * même résultat.
 *
 * `CRON_SECRET` est lu au premier appel puis mis en cache par le module de
 * configuration : chaque cas recharge donc les modules, comme un serveur qui
 * démarre avec un environnement donné.
 */
const SECRET = 'secret-cron-de-test-0123456789';

async function loadRoute(secret: string | undefined) {
  vi.resetModules();
  if (secret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = secret;
  return import('@/app/api/cron/relances/route');
}

function request(token?: string) {
  return new Request('https://devisia.test/api/cron/relances', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

afterEach(() => {
  delete process.env.CRON_SECRET;
  vi.resetModules();
});

describe('tâche planifiée des relances', () => {
  it('expose les deux méthodes attendues', async () => {
    const route = await loadRoute(SECRET);
    expect(typeof route.GET).toBe('function');
    expect(typeof route.POST).toBe('function');
  });

  it('refuse un appel sans secret partagé configuré', async () => {
    const route = await loadRoute(undefined);
    for (const handler of [route.GET, route.POST]) {
      const response = await handler(request(SECRET));
      expect(response.status).toBe(503);
    }
  });

  it('refuse un jeton absent ou incorrect', async () => {
    const route = await loadRoute(SECRET);
    for (const handler of [route.GET, route.POST]) {
      expect((await handler(request())).status).toBe(401);
      expect((await handler(request('mauvais-secret'))).status).toBe(401);
    }
  });

  it('traite les relances sur un GET, comme le fait Vercel', async () => {
    const route = await loadRoute(SECRET);
    const response = await route.GET(request(SECRET));
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: { expiredQuotes: number; [key: string]: unknown };
    };
    expect(typeof body.data.expiredQuotes).toBe('number');
  });

  it('rend le même résultat sur un POST', async () => {
    const route = await loadRoute(SECRET);
    const [get, post] = await Promise.all([
      route.GET(request(SECRET)).then((r) => r.json()),
      route.POST(request(SECRET)).then((r) => r.json()),
    ]);
    expect(Object.keys(get.data).sort()).toEqual(Object.keys(post.data).sort());
  });
});
