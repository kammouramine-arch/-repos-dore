import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, AI_TIMEOUT_MS } from '@devisia/shared';
import { GeminiProvider, profilDevis, profilVision } from '@/lib/ai/gemini';
import { z } from 'zod';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('AI creation reliability', () => {
  it('waits for AI beyond the ordinary 20 second request deadline', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('Native request failed')));
      setTimeout(() => resolve(new Response(JSON.stringify({ data: { title: 'Devis' } }))), 25_000);
    }));
    const pending = createApiClient({ baseUrl: 'https://test.invalid', fetchImpl }).ai.generateQuote({ description: 'Remplacer un siphon' });
    await vi.advanceTimersByTimeAsync(25_000);
    await expect(pending).resolves.toMatchObject({ title: 'Devis' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('reports native timeout errors as TIMEOUT, never NETWORK', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('Native request failed')));
    }));
    const pending = createApiClient({ baseUrl: 'https://test.invalid', fetchImpl }).ai.generateQuote({ description: 'Remplacer un siphon' }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS + 1);
    expect(await pending).toMatchObject({ code: 'TIMEOUT' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('recovers truncated JSON using another model without repeating the overloaded endpoint', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      if (url.endsWith('/models')) return Response.json({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
      return Response.json({ candidates: [{ content: { parts: [{ text: url.includes('broken') ? '{"title":' : '{"title":"Devis complet"}' }] } }] });
    });
    const result = await new GeminiProvider('test-key', profilDevis('broken'), profilVision()).generateStructuredOutput({ system: 'Quote', untrusted: 'siphon', schema: z.object({ title: z.string() }), schemaName: 'quote' });
    expect(result.data.title).toBe('Devis complet');
    expect(urls.filter((u) => u.includes('broken'))).toHaveLength(1);
  });
});
