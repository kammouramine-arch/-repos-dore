import { expect, it } from 'vitest';
const path = '../../scripts/sandbox-reset-guard.mjs';
const { assertDisposableSandbox } = await import(path);
const input = { environment: 'Sandbox', provider: 'apple', originalTransactionId: 'test', expectedTransactionId: 'test', customers: 0, quotes: 0, provenance: 'Recorded automated test provenance', approval: 'Explicit owner approval reference' };
it('rejects production, unknown environments, changed bindings and business data', () => {
  for (const change of [{ environment: 'Production' }, { environment: null }, { provider: 'stripe' }, { expectedTransactionId: 'other' }, { customers: 1 }, { quotes: 1 }, { provenance: '' }, { approval: '' }]) {
    expect(() => assertDisposableSandbox({ ...input, ...change })).toThrow();
  }
  expect(() => assertDisposableSandbox(input)).not.toThrow();
});
