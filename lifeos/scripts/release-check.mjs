#!/usr/bin/env node
/**
 * Refuses to pass while anything required for a store submission is still unset.
 *
 *   npm run release:check
 *
 * This is deliberately separate from the test suite: the tests describe how the code
 * behaves, this describes whether *this build* may be submitted. It fails loudly on
 * empty legal URLs, placeholder ids and missing configuration, so nothing reaches
 * review pointing at a link that does not exist.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

const problems = [];
const warnings = [];

// ── brand and legal ───────────────────────────────────────────────────────────
const brand = JSON.parse(read('src/config/brand.json'));

for (const [key, label] of [
  ['privacyUrl', 'Privacy policy URL'],
  ['termsUrl', 'Terms of use URL'],
]) {
  const value = brand[key];
  if (!value) problems.push(`${label} is not set (src/config/brand.json → ${key}).`);
  else if (!value.startsWith('https://')) problems.push(`${label} must be an https URL.`);
  else if (/example\.com|placeholder|localhost/i.test(value)) {
    problems.push(`${label} still points at a placeholder domain.`);
  }
}

if (!brand.supportEmail) {
  problems.push('Support email is not set (src/config/brand.json → supportEmail).');
} else if (/example\.com|placeholder/i.test(brand.supportEmail)) {
  problems.push('Support email still uses a placeholder domain.');
}

// ── store submission config ───────────────────────────────────────────────────
const eas = JSON.parse(read('eas.json'));
const submit = eas.submit?.production ?? {};
for (const [platform, fields] of [
  ['ios', ['appleId', 'ascAppId', 'appleTeamId']],
  ['android', ['serviceAccountKeyPath']],
]) {
  for (const field of fields) {
    const value = submit[platform]?.[field];
    if (!value || String(value).startsWith('REPLACE_WITH')) {
      problems.push(`eas.json → submit.production.${platform}.${field} is not set.`);
    }
  }
}

// ── client environment ────────────────────────────────────────────────────────
if (existsSync(resolve(root, '.env'))) {
  const env = read('.env');
  for (const key of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']) {
    if (!new RegExp(`^${key}=.+$`, 'm').test(env)) problems.push(`${key} is empty in .env.`);
  }
  if (!/^EAS_PROJECT_ID=.+$/m.test(env)) {
    warnings.push('EAS_PROJECT_ID is unset — push notifications will not register.');
  }
} else {
  problems.push('.env is missing. Copy .env.example and fill it in.');
}

// ── assets ────────────────────────────────────────────────────────────────────
for (const asset of [
  'assets/icon.png',
  'assets/splash-icon.png',
  'assets/android-icon-foreground.png',
  'assets/android-icon-background.png',
  'assets/favicon.png',
]) {
  const path = resolve(root, asset);
  if (!existsSync(path)) problems.push(`${asset} is missing. Run: npm run icons`);
  else if (statSync(path).size < 500) problems.push(`${asset} looks empty.`);
}

// ── secrets must never be committed ──────────────────────────────────────────
const ignore = read('.gitignore');
for (const pattern of ['.env', '*.p8', 'service-account*.json']) {
  if (!ignore.includes(pattern)) problems.push(`.gitignore is missing "${pattern}".`);
}

// ── report ────────────────────────────────────────────────────────────────────
const name = brand.name ?? 'the app';
if (warnings.length) {
  console.log(`\nWarnings:\n${warnings.map((w) => `  · ${w}`).join('\n')}`);
}

if (problems.length === 0) {
  console.log(`\n${name} passes the release check. Store submission config is complete.\n`);
  process.exit(0);
}

console.error(`\n${name} is not ready to submit — ${problems.length} item(s) outstanding:\n`);
for (const problem of problems) console.error(`  ✗ ${problem}`);
console.error('\nSee docs/DEPLOYMENT.md for where each of these comes from.\n');
process.exit(1);
