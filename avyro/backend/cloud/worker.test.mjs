import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';

// Exercise workerd and a real local D1 database, rather than a mock SQL adapter.
const base = process.env.AVYRO_CLOUD_TEST_URL ?? 'http://127.0.0.1:8790';
const request = (route, data, token) => fetch(base + route, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined });

test('anonymous access works without a personal account; reports stay pending and private', async () => {
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/incidents')).status, 401);
  const guest = await request('/auth/guest', {}); assert.equal(guest.status, 201);
  const { token, expiresAt } = await guest.json(); assert.match(token, /^[A-Za-z0-9_-]{43}$/); assert.ok(expiresAt > Date.now());
  assert.equal((await request('/moderation', null, token)).status, 403);
  const report = await request('/incidents', { category: 'hazard', latitude: 48.856612, longitude: 2.352219, observedAt: Date.now(), consent: true, status: 'approved' }, token);
  assert.equal(report.status, 202); assert.equal((await report.json()).status, 'pending');
  assert.ok((await (await request('/incidents', null, token)).json()).every(item => item.status !== 'pending'));
  const traffic = await request('/incidents', { category: 'traffic', latitude: 48.856612, longitude: 2.352219, observedAt: Date.now(), consent: true, status: 'approved' }, token);
  assert.equal(traffic.status, 202); assert.equal((await traffic.json()).status, 'pending');
  assert.ok((await (await request('/incidents', null, token)).json()).every(item => item.status !== 'pending'));
  assert.equal((await request('/incidents', { category: 'hazard', latitude: 48, longitude: 2, observedAt: Date.now(), consent: false }, token)).status, 400);
  assert.equal((await request('/roads/context', { consent: true }, token)).status, 503);
  assert.equal((await request('/auth/logout', {}, token)).status, 200);
  assert.equal((await request('/auth/me', null, token)).status, 401);
});

test('optional hosted accounts hash passwords, authenticate, reject wrong credentials and revoke sessions', async () => {
  const email = `synthetic-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('base64url');
  const registration = await request('/auth/register', { email, password, fullName: 'Synthetic cloud verification' });
  assert.equal(registration.status, 201, `Registration response: ${await registration.clone().text()}`);
  const session = await registration.json(); assert.equal(session.user.email, email); assert.ok(session.issuedAt <= Date.now());
  assert.equal((await request('/auth/login', { email, password: 'wrong-password' })).status, 401);
  const login = await request('/auth/login', { email, password }); assert.equal(login.status, 200);
  assert.equal((await request('/auth/me', null, session.token)).status, 200);
  assert.equal((await request('/auth/logout', {}, session.token)).status, 200);
  assert.equal((await request('/auth/me', null, session.token)).status, 401);
});

test('untrusted input cannot exceed the body bound or masquerade as moderator credentials', async () => {
  assert.equal((await request('/auth/guest', { padding: 'x'.repeat(17000) })).status, 413);
  assert.equal((await request('/moderation', { id: 'anything', decision: 'approved' }, 'fake-token')).status, 401);
});

test('speech endpoint requires authentication, consent and valid bounded WAV', async () => {
  assert.equal((await request('/speech/transcribe', { audio: 'bad', language: 'auto', consent: true })).status, 401);
  const { token } = await (await request('/auth/guest', {})).json();
  assert.equal((await request('/speech/transcribe', { audio: 'bad', language: 'auto', consent: false }, token)).status, 400);
  assert.equal((await request('/speech/transcribe', { audio: 'bad', language: 'auto', consent: true }, token)).status, 400);
  assert.equal((await request('/speech/transcribe', { padding: 'x'.repeat(900001) }, token)).status, 413);
});


test('explicit community observations appear immediately as unverified with bounded expiry', async () => {
  const { token } = await (await request('/auth/guest', {})).json();
  const response = await request('/incidents', { category: 'traffic', latitude: 48.856612, longitude: 2.352219, observedAt: Date.now(), consent: true, publication: 'community', status: 'approved' }, token);
  assert.equal(response.status, 202);
  const report = await response.json();
  assert.equal(report.status, 'community');
  assert.ok(report.expires - Date.now() <= 3600000);
  const feed = await (await request('/incidents?community=1', null, token)).json();
  assert.ok(!(await (await request('/incidents', null, token)).json()).some(item => item.id === report.id));
  assert.equal(feed.find(item => item.id === report.id)?.status, 'community');
  assert.equal(report.latitude, 48.8566);
  assert.equal((await request('/moderation', { id: report.id, decision: 'approved' }, token)).status, 403);
});

test('planned-road metadata also requires authentication and the configured road provider', async () => {
  assert.equal((await request('/roads/ahead', { consent: true, geometry: [[3,50],[3.001,50]] })).status, 401);
  const { token } = await (await request('/auth/guest', {})).json();
  assert.equal((await request('/roads/ahead', { consent: true, geometry: [[3,50],[3.001,50]] }, token)).status, 503);
});
