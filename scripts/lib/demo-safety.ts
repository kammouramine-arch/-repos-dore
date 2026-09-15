/** Demo reset is deliberately limited to an explicitly opted-in local database. */
export function assertDemoDatabase(environment: Record<string, string | undefined>) {
  if (environment.NODE_ENV === 'production' || environment.DEVISIA_ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed requires DEVISIA_ALLOW_DEMO_SEED=true in a non-production environment.');
  }
  const target = new URL(environment.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
    throw new Error('Demo seed is restricted to a local PostgreSQL database.');
  }
  if (!/demo|test/i.test(target.pathname)) throw new Error('Use a dedicated database with demo or test in its name.');
}
