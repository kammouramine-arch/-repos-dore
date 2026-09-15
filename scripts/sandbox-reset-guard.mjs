export function assertDisposableSandbox({ environment, provider, originalTransactionId, expectedTransactionId, customers, quotes, provenance, approval }) {
  if (environment !== 'Sandbox' || provider !== 'apple') throw new Error('Sandbox Apple binding required');
  if (!originalTransactionId || originalTransactionId !== expectedTransactionId) throw new Error('Binding changed');
  if (customers !== 0 || quotes !== 0) throw new Error('Business data exists; manual review required');
  if (!provenance || !approval || provenance.length < 16 || approval.length < 16) throw new Error('Recorded provenance and explicit approval required');
}
