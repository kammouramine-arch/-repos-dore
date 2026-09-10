import { afterEach, describe, expect, it, vi } from 'vitest';
import { fail } from '@/server/api';
import { AppError } from '@/lib/errors';

/**
 * Une erreur serveur inattendue porte une référence courte, renvoyée à
 * l'application et écrite dans le journal : c'est ce qui relie un « problème
 * temporaire » vu sur un iPhone à la ligne de journal Vercel correspondante.
 */
describe('référence des erreurs serveur', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  afterEach(() => error.mockClear());

  it('attache une référence à une exception non gérée, dans le corps, l’en-tête et le journal', async () => {
    const response = fail(new Error('boom interne'));
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { code: string; requestId: string; message: string } };
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.requestId).toMatch(/^[0-9a-f]{8}$/);
    expect(response.headers.get('x-request-id')).toBe(body.error.requestId);
    // Le journal cite la référence, jamais le message n'atteint le client.
    expect(JSON.stringify(error.mock.calls[0]?.[0])).toContain(body.error.requestId);
    expect(body.error.message).not.toContain('boom interne');
  });

  it('laisse une erreur applicative typée telle quelle, sans référence', async () => {
    const response = fail(new AppError('UNAUTHENTICATED'));
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { requestId?: string } };
    expect(body.error.requestId).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
  });
});
