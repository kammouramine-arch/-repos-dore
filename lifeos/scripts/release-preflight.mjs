#!/usr/bin/env node
/**
 * Everything that must be true before an App Store build, checked live.
 *
 * The unit suite proves the configuration is internally consistent. This proves the
 * outside world agrees: the legal pages Apple will open actually resolve, the backend
 * the binary will embed actually answers, and production auth is not left in the state
 * a test harness needed. Each of those has already cost a build cycle once.
 *
 *   node scripts/release-preflight.mjs
 *
 * Exits non-zero if anything a reviewer would hit is broken.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brand = JSON.parse(readFileSync(resolve(root, 'src/config/brand.json'), 'utf8'));
const eas = JSON.parse(readFileSync(resolve(root, 'eas.json'), 'utf8'));

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
};

async function head(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    return { status: 0, body: '', error: e.message };
  }
}

console.log('LifeOS release preflight\n');

console.log('Legal pages (Apple 3.1.2 — a reviewer opens these):');
for (const key of ['privacyUrl', 'termsUrl']) {
  const url = brand[key];
  if (!url) { record(key, false, 'not set in brand.json'); continue; }
  const r = await head(url);
  const looksReal = r.body.length > 2000 && /privacy|terms/i.test(r.body);
  const placeholder = /SUPPORT_EMAIL|REPLACE_WITH|lorem ipsum/i.test(r.body);
  record(
    `${key} resolves`,
    r.status === 200 && looksReal && !placeholder,
    r.status !== 200 ? `HTTP ${r.status}${r.error ? ` (${r.error})` : ''}`
      : placeholder ? 'page still contains a placeholder'
      : !looksReal ? `only ${r.body.length} bytes` : `HTTP 200, ${r.body.length} bytes`,
  );
}
record('support address is set', Boolean(brand.supportEmail?.includes('@')), brand.supportEmail || 'missing');

console.log('\nProduction backend (what the binary will embed):');
const url = eas.build.production.env.EXPO_PUBLIC_SUPABASE_URL;
const key = eas.build.production.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
record('production profile has a backend', Boolean(url && key), url || 'missing');

if (url && key) {
  const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    .then((r) => r.json()).catch(() => null);
  record('auth endpoint answers', Boolean(settings), settings ? 'reachable' : 'unreachable');
  if (settings) {
    // Left off during scripted testing once; it must not ship that way.
    record(
      'email confirmation is required',
      settings.mailer_autoconfirm === false,
      settings.mailer_autoconfirm === false ? 'on' : 'OFF — open signup',
    );
  }
  const anon = await fetch(`${url}/rest/v1/profiles?select=id`, { headers: { apikey: key } })
    .then((r) => r.json()).catch(() => null);
  record(
    'anonymous callers read no user data',
    Array.isArray(anon) && anon.length === 0,
    Array.isArray(anon) ? `${anon.length} rows` : 'unexpected response',
  );
  // A key that is not the anon key must never reach a build profile.
  let role = 'unknown';
  if (key.startsWith('eyJ')) {
    try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64')).role; } catch { /* leave unknown */ }
  } else if (key.startsWith('sb_publishable_')) role = 'publishable';
  record('embedded key is publishable, not service_role', role === 'anon' || role === 'publishable', `role=${role}`);
}

console.log('\nStore configuration:');
const ios = eas.submit?.production?.ios ?? {};
record('App Store Connect app id set', Boolean(ios.ascAppId), ios.ascAppId ?? 'missing');
record('Apple team id set', Boolean(ios.appleTeamId), ios.appleTeamId ?? 'missing');
record('no placeholders in submit config', !JSON.stringify(eas.submit).includes('REPLACE_WITH'));

const failed = results.filter((r) => !r.ok);
console.log(`\n${'='.repeat(58)}`);
console.log(`  ${results.length - failed.length} passed · ${failed.length} failed`);
console.log('='.repeat(58));
if (failed.length) {
  console.log('\nBlocking:');
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
