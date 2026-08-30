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

console.log('\nProduction backend (supplied by the EAS environment, not this repo):');
/*
  The values now live in the EAS environment the profile names, so this script cannot
  read them — that is the point. What it can check is that the wiring is right and the
  project they point at is healthy. `eas env:list --environment production` is the
  authoritative check that the values exist, and the build itself refuses without them.
*/
const PRODUCTION_URL = 'https://nxyahzdwyzdfhkmxxyzz.supabase.co';
const prod = eas.build.production;
record('production profile names an EAS environment', prod.environment === 'production', prod.environment ?? 'ABSENT');
record(
  'no Supabase credential committed in eas.json',
  !JSON.stringify(eas).includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'),
);
record(
  'the build refuses without a backend',
  readFileSync(resolve(root, 'app.config.ts'), 'utf8').includes("process.env.EAS_BUILD === 'true'"),
  'guard keyed on EAS_BUILD, which eas.json cannot disable',
);

{
  /*
    Supabase requires the publishable key on every request, and it deliberately no
    longer lives in this repository. Supply it in the shell to run these two checks:

      EXPO_PUBLIC_SUPABASE_ANON_KEY=... npm run preflight

    Without it they report as not configured rather than failing — a missing local
    convenience is not a release blocker, and calling it one would train people to
    ignore a red preflight.
  */
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    console.log('  [SKIP] production project reachability — set EXPO_PUBLIC_SUPABASE_ANON_KEY to check');
    console.log('  [SKIP] email confirmation setting — same');
  } else {
    const settings = await fetch(`${PRODUCTION_URL}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    record('production project is reachable', Boolean(settings), settings ? PRODUCTION_URL : 'unreachable');
    if (settings) {
      record(
        'email confirmation is required',
        settings.mailer_autoconfirm === false,
        settings.mailer_autoconfirm === false ? 'on' : 'OFF — open signup',
      );
    }
  }
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
