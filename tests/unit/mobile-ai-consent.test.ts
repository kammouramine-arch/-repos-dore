import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AI_CONSENT_VERSION } from '@devisia/shared';
import { aiConsentState, aiConsentText, withAiConsent } from '../../mobile/src/features/ai-consent';

/**
 * Garde mobile : la feuille de consentement précède toute requête IA.
 *
 * Constaté par App Review sur le build 40 : la première action IA envoyait
 * la description au fournisseur sans permission. Ces cas figent l'ordre
 * (autorisation, puis requête), le refus (aucune requête, application
 * utilisable), la persistance par compte et le retrait depuis Mon espace.
 */
const ROOT = path.resolve(__dirname, '../..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

const session = (aiConsent: Parameters<typeof aiConsentState>[0] extends infer S ? (S extends { aiConsent?: infer C } ? C : never) : never, provider: 'gemini' | 'anthropic' | 'local' = 'gemini') => ({
  capabilities: { generation: true, vision: true, transcription: false, provider },
  aiConsent,
});

describe('état du consentement dans la session', () => {
  it('part de « non autorisé » et ne bascule que sur une autorisation à jour', () => {
    expect(aiConsentState(null).granted).toBe(false);
    expect(aiConsentState(session(null)).granted).toBe(false);
    expect(aiConsentState(session({ status: 'DECLINED', version: AI_CONSENT_VERSION, provider: 'gemini', decidedAt: 'x' })).granted).toBe(false);
    expect(aiConsentState(session({ status: 'GRANTED', version: AI_CONSENT_VERSION, provider: 'gemini', decidedAt: 'x' })).granted).toBe(true);
    expect(aiConsentState(session({ status: 'GRANTED', version: AI_CONSENT_VERSION, provider: 'gemini', decidedAt: 'x' }, 'anthropic')).granted).toBe(false);
    expect(aiConsentState(session({ status: 'REVOKED', version: AI_CONSENT_VERSION, provider: 'gemini', decidedAt: 'x' })).granted).toBe(false);
    expect(aiConsentState(session(null, 'local'))).toMatchObject({ required: false, granted: true });
  });

  it('présente le même texte que le serveur, avec le fournisseur réel', () => {
    const text = aiConsentText({ provider: 'gemini' }, 'fr');
    expect(text.title).toBe('Utilisation de l’intelligence artificielle');
    expect(text.intro).toContain('Google (service Gemini API)');
    expect(text.allow).toBe('Autoriser et continuer');
    expect(text.decline).toBe('Pas maintenant');
  });
});

describe('garde avant requête', () => {
  it('ne lance jamais la requête sur refus, et la lance une seule fois sur accord', async () => {
    const run = vi.fn(async () => 'draft');
    expect(await withAiConsent(async () => false, run)).toEqual({ allowed: false });
    expect(run).not.toHaveBeenCalled();
    expect(await withAiConsent(async () => true, run)).toEqual({ allowed: true, result: 'draft' });
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('écrans', () => {
  const nouveau = read('mobile/app/devis/nouveau.tsx');
  const detail = read('mobile/app/devis/[id].tsx');
  const sheet = read('mobile/src/components/ai-consent-sheet.tsx');
  const provider = read('mobile/src/lib/ai-consent.tsx');
  const espace = read('mobile/app/(app)/plus.tsx');
  const privacy = read('mobile/app/confidentialite-ia.tsx');
  const layout = read('mobile/app/_layout.tsx');

  it('demande l’autorisation avant chacun des deux appels de préparation du devis', () => {
    const calls = [...nouveau.matchAll(/api\.ai\.generateQuote\(/g)].map((match) => match.index ?? -1);
    expect(calls).toHaveLength(2);
    for (const index of calls) {
      const before = nouveau.slice(0, index);
      const ensure = before.lastIndexOf('await aiConsent.ensure()');
      const fn = Math.max(before.lastIndexOf('async function generate('), before.lastIndexOf('async function prepare('));
      expect(ensure, 'ensure() précède la requête dans la même fonction').toBeGreaterThan(fn);
    }
    // Un refus explique, garde la saisie et propose de redemander.
    expect(nouveau).toContain('explainConsentNeeded');
    expect(nouveau).toContain('.declined');
    // Un refus côté serveur remet la garde en place au lieu de boucler.
    expect(nouveau).toContain('isAiConsentError(cause)');
  });

  it('demande l’autorisation avant d’ouvrir la relance, et le dit quand le message est préparé sans IA', () => {
    expect(detail).toContain('const allowed = await aiConsent.ensure();');
    expect(detail.indexOf('await aiConsent.ensure()')).toBeLessThan(detail.indexOf('setFollowUpOpen(true)'));
    expect(detail).toContain('withAi={followUpWithAi}');
    expect(detail).toContain('Préparé sans IA');
  });

  it('la feuille n’a ni case pré-cochée ni accord implicite : deux boutons explicites', () => {
    expect(sheet).toContain('copy.allow');
    expect(sheet).toContain('copy.decline');
    expect(sheet).not.toMatch(/Switch|CheckBox|defaultChecked|value=\{true\}/);
    expect(sheet).toContain('onRequestClose={busy ? undefined : onDecline}');
  });

  it('enregistre chaque décision sur le serveur et reflète la session', () => {
    expect(provider).toContain("api.ai.setConsent(status, state.version)");
    expect(provider).toContain("record('GRANTED')");
    expect(provider).toContain("record('DECLINED')");
    expect(provider).toContain("record('REVOKED')");
    expect(provider).toContain('adoptSession({ ...session, aiConsent: consent })');
    // Fermer sans décider vaut refus : la promesse se résout à faux.
    expect(provider).toContain('settle(false)');
  });

  /*
   * « Intelligence artificielle · Autorisée » s'affichait au même rang que
   * l'abonnement : une information d'implémentation promue au rang de
   * fonction. Le consentement reste dû, reste retirable, mais il est nommé
   * par ce qu'il fait et rangé avec les informations légales.
   */
  it('range le consentement avec les informations légales, nommé par son effet', () => {
    expect(espace).toContain("router.push('/confidentialite-ia')");
    expect(espace).toContain('Utilisation de vos données');
    // Ce qui compte est ce qui s'affiche : les commentaires ont le droit de
    // nommer ce qu'on a retiré de l'écran.
    const rendu = espace.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(rendu).not.toContain('Intelligence artificielle');
    expect(privacy).toContain('Retirer mon autorisation');
    expect(privacy).toContain('Autoriser l’IA');
    expect(privacy).toContain('revoke()');
    expect(layout).toContain('<AiConsentProvider>');
    expect(layout).toContain('name="confidentialite-ia"');
  });

  it('le client partagé enregistre la décision avec la version du texte', () => {
    const client = read('packages/shared/src/api-client.ts');
    expect(client).toContain("request<AiConsentDTO>('/api/ai/consent', { method: 'PUT', json: { status, version } })");
  });

  it('le serveur garde chaque route IA, y compris l’assistant et la transcription', () => {
    expect(read('src/app/api/ai/quote/route.ts')).toContain('await assertAiConsent(auth.user.id, organizationId);');
    expect(read('src/app/api/ai/analyse-photo/route.ts')).toContain('await assertAiConsent(auth.user.id, organizationId);');
    expect(read('src/app/api/ai/transcribe/route.ts')).toContain('await assertAiConsent(auth.user.id, organizationId);');
    const assistant = read('src/server/services/assistantService.ts');
    expect(assistant.indexOf('hasAiConsent(userId, organizationId)')).toBeLessThan(assistant.indexOf('generateStructuredOutput('));
    const policy = read('src/app/(marketing)/confidentialite/page.tsx');
    expect(policy).toContain('Google LLC');
    expect(policy).toContain('Gemini API');
    expect(policy).toContain('Retrait');
    expect(policy).toContain('Conservation et suppression');
  });
});
