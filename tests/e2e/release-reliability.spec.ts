import { expect, test } from '@playwright/test';

test('legal destinations and repeated protected requests remain available', async ({ request }) => {
  for (const path of ['/confidentialite', '/conditions', '/mentions-legales', '/cookies', '/assistance', '/assistance?lang=en']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('DEVISERA');
  }
  const timings: number[] = [];
  for (let index = 0; index < 20; index++) {
    const start = Date.now();
    const response = await request.get(index % 2 ? '/api/auth/session' : '/api/billing/payments');
    timings.push(Date.now() - start);
    expect(response.status()).toBe(401);
    expect(response.headers()['x-vercel-mitigated']).toBeUndefined();
  }
  timings.sort((a, b) => a - b);
  test.info().annotations.push({ type: 'local-protected-api-p95-ms', description: String(timings[18]) });
});

test('health reports safe release provenance without caching', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  const health = await response.json();
  expect(health.checks.database.status).toBe('ok');
  expect(health.release.commit === null || /^[a-f0-9]{40}$/.test(health.release.commit)).toBe(true);
});
