import { describe, expect, it, vi } from 'vitest';
import { createApiClient, DevisiaApiError } from '@devisia/shared';

/**
 * Client d'API partagé, tel que l'application mobile l'utilise.
 *
 * Le réseau d'un chantier est mauvais ou absent : ces cas vérifient qu'aucune
 * panne de connexion ne remonte sous forme d'erreur brute, qu'une requête ne
 * peut pas rester suspendue indéfiniment, et qu'un jeton refusé est bien
 * distingué d'une simple coupure.
 */
/** Exécute l'appel et rend l'erreur attendue, correctement typée. */
async function expectFailure(promise: Promise<unknown>): Promise<DevisiaApiError> {
  try {
    await promise;
  } catch (cause) {
    if (cause instanceof DevisiaApiError) return cause;
    throw cause;
  }
  throw new Error('La requête aurait dû échouer.');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('client API — transport', () => {
  it('joint le jeton porteur et omet les cookies', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: { unread: 0, items: [] } }));
    const api = createApiClient({
      baseUrl: 'https://exemple.test/',
      getToken: () => 'jeton-de-test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await api.notifications.list();

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://exemple.test/api/notifications');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-de-test');
    expect(init.credentials).toBe('omit');
  });

  it('traduit une panne réseau en erreur exploitable', async () => {
    const api = createApiClient({
      baseUrl: 'https://exemple.test',
      getToken: () => 'jeton',
      fetchImpl: (async () => {
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch,
    });

    await expect(api.dashboard()).rejects.toBeInstanceOf(DevisiaApiError);
    const error = await expectFailure(api.dashboard());
    expect(error.code).toBe('NETWORK');
    expect(error.retryable).toBe(true);
    expect(error.message).toMatch(/connexion/i);
  });

  it('abandonne une requête qui ne répond pas', async () => {
    const api = createApiClient({
      baseUrl: 'https://exemple.test',
      timeoutMs: 40,
      fetchImpl: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const abort = new Error('aborted');
            abort.name = 'AbortError';
            reject(abort);
          });
        })) as unknown as typeof fetch,
    });

    const error = await expectFailure(api.dashboard());
    expect(error.code).toBe('NETWORK');
    expect(error.message).toMatch(/trop de temps/i);
  });

  it('signale une session refusée sans la confondre avec une coupure', async () => {
    const onUnauthenticated = vi.fn();
    const api = createApiClient({
      baseUrl: 'https://exemple.test',
      getToken: () => 'jeton-expire',
      onUnauthenticated,
      fetchImpl: (async () =>
        jsonResponse(
          { error: { code: 'UNAUTHENTICATED', message: 'Votre session a expiré.' } },
          401,
        )) as unknown as typeof fetch,
    });

    const error = await expectFailure(api.dashboard());
    expect(error.code).toBe('UNAUTHENTICATED');
    expect(error.status).toBe(401);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('construit les chemins de devis attendus par le backend', async () => {
    const calls: string[] = [];
    const api = createApiClient({
      baseUrl: 'https://exemple.test',
      getToken: () => 'jeton',
      fetchImpl: (async (url: string) => {
        calls.push(url);
        return jsonResponse({ data: { total: 0, items: [] } });
      }) as unknown as typeof fetch,
    });

    await api.quotes.list({ statut: 'ENVOYE', take: 20 });
    await api.customers.list('dupont');
    expect(calls[0]).toBe('https://exemple.test/api/quotes?statut=ENVOYE&take=20');
    expect(calls[1]).toBe('https://exemple.test/api/customers?q=dupont');
    expect(api.quotes.pdfUrl('abc')).toBe('https://exemple.test/api/quotes/abc/pdf');
  });
});
