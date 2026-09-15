import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Consentement explicite avant tout envoi au fournisseur d'IA tiers.
 *
 * Apple a refusé le build 40 (5.1.1 (i) / 5.1.2 (i)) : des données partaient
 * vers Google Gemini sans que l'utilisateur sache quoi, vers qui, ni pourquoi.
 * Ces cas figent la règle : aucune requête au fournisseur sans autorisation
 * enregistrée sur le texte courant, refus et retrait respectés, re-demande
 * dès que le texte ou le fournisseur change.
 */
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  provider: vi.fn(() => 'gemini' as 'gemini' | 'anthropic' | 'local'),
  requirePermission: vi.fn(),
  generateQuoteDraft: vi.fn(),
  rateLimit: vi.fn(),
  generateStructuredOutput: vi.fn(),
  getAIProvider: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiConsent: { findUnique: mocks.findUnique, upsert: mocks.upsert },
    subscription: { findUnique: vi.fn(async () => ({ plan: 'PRO' })) },
    quote: {
      findFirst: vi.fn(async () => ({
        id: 'quote', number: 'DEV-1', title: 'Peinture salon', totalCents: 120000, viewCount: 1, clientMessage: 'Merci',
        customer: { firstName: 'Marie', lastName: 'Durand', companyName: null },
        organization: { name: 'Atelier', locale: 'fr', country: 'FR', currency: 'EUR', businessProfile: { legalName: 'Atelier SARL', ownerName: 'Paul' }, settings: null },
      })),
    },
  },
}));
vi.mock('@/lib/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/env')>()),
  aiProviderKind: () => mocks.provider(),
}));
vi.mock('@/lib/auth/session', () => ({ requirePermission: mocks.requirePermission, requireAuth: mocks.requirePermission }));
vi.mock('@/server/services/accessService', () => ({ assertCanWrite: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: mocks.rateLimit, RATE_LIMITS: { aiGeneration: {} } }));
vi.mock('@/server/services/usageService', () => ({ assertWithinPlan: vi.fn(), incrementUsage: vi.fn() }));
vi.mock('@/server/services/aiQuoteService', () => ({ generateQuoteDraft: mocks.generateQuoteDraft }));
vi.mock('@/lib/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai')>()),
  getAIProvider: mocks.getAIProvider,
}));

import {
  AI_CONSENT_VERSION,
  AI_PROVIDER_NAMES,
  aiConsentCopy,
  aiConsentGranted,
  aiConsentRequired,
} from '@devisia/shared';
import { assertAiConsent, hasAiConsent, recordAiConsent } from '@/server/services/aiConsentService';
import { POST as postQuote } from '@/app/api/ai/quote/route';
import { GET as getConsent, PUT as putConsent } from '@/app/api/ai/consent/route';
import { draftFollowUpMessage } from '@/server/services/followUpService';

const granted = { status: 'GRANTED', version: AI_CONSENT_VERSION, provider: 'gemini', decidedAt: new Date('2026-09-13T10:00:00Z') };
const auth = { user: { id: 'user-1', locale: 'fr' }, organization: { organizationId: 'org-1' } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provider.mockReturnValue('gemini');
  mocks.findUnique.mockResolvedValue(null);
  mocks.requirePermission.mockResolvedValue(auth);
  mocks.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({ ...create }));
  mocks.getAIProvider.mockReturnValue({ name: 'gemini', generateStructuredOutput: mocks.generateStructuredOutput });
});

describe('texte de consentement', () => {
  it('nomme la société réelle destinataire et ne présuppose rien', () => {
    const fr = aiConsentCopy('gemini', 'fr');
    expect(fr.intro).toContain('Google (service Gemini API)');
    expect(fr.intro).toContain('description du chantier');
    expect(fr.intro).toContain('photos');
    expect(fr.sent.join(' ')).toMatch(/catalogue de prix/);
    expect(fr.sent.join(' ')).toMatch(/nom du client/);
    expect(fr.purpose).toContain('uniquement pour traiter votre demande');
    expect(fr.allow).toBe('Autoriser et continuer');
    expect(fr.decline).toBe('Pas maintenant');
    expect(fr.withdraw).toContain('Mon espace → Confidentialité et IA');
    expect(AI_PROVIDER_NAMES.anthropic.fr).toContain('Anthropic');
    expect(aiConsentCopy('gemini', 'en').intro).toContain('Google (Gemini API service)');
  });

  it('ne vaut que pour la version et le fournisseur acceptés', () => {
    const now = { status: 'GRANTED' as const, version: AI_CONSENT_VERSION, provider: 'gemini' as const, decidedAt: '2026-09-13T10:00:00Z' };
    expect(aiConsentGranted(now, 'gemini')).toBe(true);
    expect(aiConsentGranted({ ...now, status: 'DECLINED' }, 'gemini')).toBe(false);
    expect(aiConsentGranted({ ...now, status: 'REVOKED' }, 'gemini')).toBe(false);
    expect(aiConsentGranted({ ...now, version: AI_CONSENT_VERSION - 1 }, 'gemini')).toBe(false);
    expect(aiConsentGranted(now, 'anthropic')).toBe(false);
    expect(aiConsentGranted(null, 'gemini')).toBe(false);
    // Le moteur local ne transmet rien : pas de consentement à demander.
    expect(aiConsentRequired('local')).toBe(false);
    expect(aiConsentGranted(null, 'local')).toBe(true);
  });
});

describe('service de consentement', () => {
  it('refuse tant que rien n’est enregistré, puis accepte après autorisation', async () => {
    await expect(assertAiConsent('user-1', 'org-1')).rejects.toMatchObject({ code: 'AI_CONSENT_REQUIRED', status: 403 });
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_organizationId: { userId: 'user-1', organizationId: 'org-1' } } }));
    mocks.findUnique.mockResolvedValue(granted);
    await expect(assertAiConsent('user-1', 'org-1')).resolves.toBeUndefined();
  });

  it('refuse après un refus, un retrait, un texte plus ancien ou un changement de fournisseur', async () => {
    for (const record of [
      { ...granted, status: 'DECLINED' },
      { ...granted, status: 'REVOKED' },
      { ...granted, version: AI_CONSENT_VERSION - 1 },
      { ...granted, provider: 'anthropic' },
    ]) {
      mocks.findUnique.mockResolvedValue(record);
      expect(await hasAiConsent('user-1', 'org-1'), JSON.stringify(record)).toBe(false);
    }
    mocks.findUnique.mockResolvedValue(granted);
    mocks.provider.mockReturnValue('anthropic');
    expect(await hasAiConsent('user-1', 'org-1')).toBe(false);
  });

  it('enregistre la décision avec la version du texte, le fournisseur et l’horodatage, sans autre donnée', async () => {
    const result = await recordAiConsent('user-1', 'org-1', 'GRANTED', AI_CONSENT_VERSION);
    const call = mocks.upsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(Object.keys(call.create).sort()).toEqual(['decidedAt', 'organizationId', 'provider', 'status', 'userId', 'version']);
    expect(call.create).toMatchObject({ status: 'GRANTED', version: AI_CONSENT_VERSION, provider: 'gemini' });
    expect(result.status).toBe('GRANTED');
    expect(result.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await expect(recordAiConsent('user-1', 'org-1', 'GRANTED', AI_CONSENT_VERSION + 1)).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('expose la décision par compte et entreprise via l’API', async () => {
    mocks.findUnique.mockResolvedValue(granted);
    const read = await getConsent();
    expect(await read.json()).toEqual({ data: { status: 'GRANTED', version: AI_CONSENT_VERSION, provider: 'gemini', decidedAt: '2026-09-13T10:00:00.000Z' } });
    const revoke = await putConsent(new Request('http://localhost/api/ai/consent', { method: 'PUT', body: JSON.stringify({ status: 'REVOKED', version: AI_CONSENT_VERSION }) }));
    expect(revoke.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ status: 'REVOKED' }) }));
  });
});

describe('routes IA', () => {
  const body = () => new Request('http://localhost/api/ai/quote', { method: 'POST', body: JSON.stringify({ description: 'Refaire la peinture du salon', fileIds: [] }) });

  it('ne prépare aucun devis sans autorisation : rien ne part, la limite n’est pas consommée', async () => {
    const response = await postQuote(body());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'AI_CONSENT_REQUIRED' } });
    expect(mocks.generateQuoteDraft).not.toHaveBeenCalled();
    expect(mocks.rateLimit).not.toHaveBeenCalled();
  });

  it('prépare le devis une fois l’autorisation enregistrée, et plus après retrait', async () => {
    mocks.findUnique.mockResolvedValue(granted);
    mocks.generateQuoteDraft.mockResolvedValue({ title: 'Peinture' });
    expect((await postQuote(body())).status).toBe(200);
    expect(mocks.generateQuoteDraft).toHaveBeenCalledTimes(1);

    mocks.findUnique.mockResolvedValue({ ...granted, status: 'REVOKED' });
    expect((await postQuote(body())).status).toBe(403);
    expect(mocks.generateQuoteDraft).toHaveBeenCalledTimes(1);
  });

  it('rédige la relance avec un modèle local sans autorisation, et avec l’IA après', async () => {
    const withoutConsent = await draftFollowUpMessage('org-1', 'quote', 1, 'professionnel', 'fr', 'user-1');
    expect(mocks.generateStructuredOutput).not.toHaveBeenCalled();
    expect(withoutConsent).toMatchObject({ aiUsed: false, degraded: false });
    expect(withoutConsent.message).toContain('Marie');

    mocks.findUnique.mockResolvedValue(granted);
    mocks.generateStructuredOutput.mockResolvedValue({ data: { objet: 'Suite', message: 'Bonjour Marie' }, usage: { provider: 'gemini' } });
    const withConsent = await draftFollowUpMessage('org-1', 'quote', 1, 'professionnel', 'fr', 'user-1');
    expect(mocks.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(withConsent).toMatchObject({ aiUsed: true, objet: 'Suite' });
  });

  it('ne demande rien quand le serveur tourne sur le moteur local', async () => {
    mocks.provider.mockReturnValue('local');
    await expect(assertAiConsent('user-1', 'org-1')).resolves.toBeUndefined();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
