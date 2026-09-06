import { describe, it, expect } from 'vitest';
import { assertDemoDatabase } from '../../scripts/lib/demo-safety';
describe('demo seed isolation', () => {
  const safe = { NODE_ENV: 'development', DEVISIA_ALLOW_DEMO_SEED: 'true', DATABASE_URL: 'postgresql://localhost/devisia_demo' };
  it('allows an opted-in local demo database', () => expect(() => assertDemoDatabase(safe)).not.toThrow());
  it('rejects production, remote, ordinary databases and missing consent', () => {
    for (const overrides of [{NODE_ENV:'production'}, {DATABASE_URL:'postgresql://remote.example/devisia_demo'}, {DATABASE_URL:'postgresql://localhost/devisia'}, {DEVISIA_ALLOW_DEMO_SEED:''}]) {
      expect(() => assertDemoDatabase({...safe, ...overrides})).toThrow();
    }
  });
});
