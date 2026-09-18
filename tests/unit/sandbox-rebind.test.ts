import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const guard = path.resolve(__dirname, '../../scripts/sandbox-rebind-guard.mjs');
const { assertSandboxRebind } = await import(guard);

/**
 * Réconciliation Sandbox : ce qui doit être refusé.
 *
 * L'exception n'existe que pour une transaction attestée Sandbox par Apple.
 * Ces cas figent chaque verrou séparément : si l'un saute, la Production
 * pourrait être touchée, et le test doit alors échouer.
 */
const valid = {
  environment: 'Sandbox',
  originalTransactionId: '2000000900000001',
  sourceOrganizationId: '11111111-1111-1111-1111-111111111111',
  targetOrganizationId: '22222222-2222-2222-2222-222222222222',
  targetHasAppleBinding: false,
  targetStripeSubscriptionId: null,
  targetStatus: 'incomplete',
  approval: 'approbation-proprietaire-2026-09-09',
  provenance: 'incident-testflight-build-33',
};

describe('réconciliation Sandbox', () => {
  it('accepte un cas complet et attesté Sandbox', () => {
    expect(() => assertSandboxRebind(valid)).not.toThrow();
  });

  it('refuse toute transaction de Production', () => {
    for (const environment of ['Production', 'PRODUCTION', undefined, null, '']) {
      expect(() => assertSandboxRebind({ ...valid, environment }), String(environment)).toThrow(/Sandbox/);
    }
  });

  it('refuse un espace source sans lien Apple', () => {
    expect(() => assertSandboxRebind({ ...valid, originalTransactionId: null })).toThrow(/aucun lien Apple/);
  });

  it('exige deux espaces distincts et explicites', () => {
    expect(() => assertSandboxRebind({ ...valid, targetOrganizationId: null })).toThrow(/explicitement/);
    expect(() => assertSandboxRebind({ ...valid, sourceOrganizationId: null })).toThrow(/explicitement/);
    expect(() => assertSandboxRebind({ ...valid, targetOrganizationId: valid.sourceOrganizationId })).toThrow(/identiques/);
  });

  it('refuse d’écraser un abonnement existant de l’espace cible', () => {
    expect(() => assertSandboxRebind({ ...valid, targetHasAppleBinding: true })).toThrow(/déjà un abonnement Apple/);
    expect(() => assertSandboxRebind({ ...valid, targetStripeSubscriptionId: 'sub_x', targetStatus: 'active' })).toThrow(/abonnement web vivant/);
    expect(() => assertSandboxRebind({ ...valid, targetStripeSubscriptionId: 'sub_x', targetStatus: 'past_due' })).toThrow(/abonnement web vivant/);
  });

  it('exige une approbation et une provenance consignées', () => {
    for (const field of ['approval', 'provenance']) {
      expect(() => assertSandboxRebind({ ...valid, [field]: undefined }), field).toThrow();
      expect(() => assertSandboxRebind({ ...valid, [field]: 'trop court' }), field).toThrow();
    }
  });
});

describe('chemin serveur', () => {
  const source = readFileSync(path.resolve(__dirname, '../../src/server/services/appleBillingService.ts'), 'utf8');

  it('garde l’exception derrière l’environnement Sandbox et le drapeau du fournisseur', () => {
    expect(source).toMatch(/APPLE_ALLOW_SANDBOX !== 'true'\) return null/);
    expect(source).toMatch(/t\.environment !== Environment\.SANDBOX\) return null/);
  });

  it('ne déplace jamais un lien vivant, même avec une autorisation', () => {
    expect(source).toContain('const grant = mismatched && !binding ? await sandboxRebindGrant(transaction, organizationId) : null;');
  });

  it('consomme l’autorisation une seule fois et la journalise', () => {
    expect(source).toMatch(/where: \{ id: grant\.id, usedAt: null \}/);
    expect(source).toContain('billing.apple.sandbox_rebind_consumed');
  });

  it('n’expose aucune route client capable de créer une autorisation', () => {
    const routes = execSync("grep -rl 'appleSandboxRebindGrant' src/app || true", { encoding: 'utf8' }).trim();
    expect(routes).toBe('');
  });
});
