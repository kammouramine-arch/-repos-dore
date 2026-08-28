/**
 * The iOS release configuration.
 *
 * These tests exist because the failure mode they guard is expensive: a build that
 * looks fine, uploads fine, and is rejected — or worse, launches with no backend and
 * has to go round App Review again. Each one pins a value that is cheap to get wrong
 * and slow to discover.
 */
import fs from 'fs';
import path from 'path';
import brand from '../src/config/brand.json';
import { missingBrandConfiguration } from '@/config/brand';
import { DEFAULT_CATALOGUE } from '@shared/plans';

const root = path.resolve(__dirname, '..');
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));

const BUILD_PROFILES = ['development', 'preview', 'production'];

describe('bundle identifier', () => {
  it('matches the App Store Connect record', () => {
    expect(brand.bundleIdentifier).toBe('com.aminekammour.lifeos');
  });

  it('keeps iOS and Android on the same identifier', () => {
    expect(brand.androidPackage).toBe(brand.bundleIdentifier);
  });

  it('is a reverse-DNS identifier Apple will accept', () => {
    expect(brand.bundleIdentifier).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/);
  });
});

describe('build-time backend configuration', () => {
  /*
    EAS does not read a local .env, so anything not declared here is empty in the
    binary. A build with no Supabase URL starts, finds nothing configured, and shows
    "Backend is not configured" — which is a Guideline 2.1 rejection discovered a week
    after upload rather than in CI.
  */
  it('gives every build profile a Supabase URL and key', () => {
    for (const profile of BUILD_PROFILES) {
      const env = eas.build[profile]?.env ?? {};
      expect(`${profile}: ${Boolean(env.EXPO_PUBLIC_SUPABASE_URL)}`).toBe(`${profile}: true`);
      expect(`${profile}: ${Boolean(env.EXPO_PUBLIC_SUPABASE_ANON_KEY)}`).toBe(`${profile}: true`);
    }
  });

  it('points the production profile at the production project', () => {
    const env = eas.build.production.env;
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe('https://nxyahzdwyzdfhkmxxyzz.supabase.co');
    expect(env.APP_ENV).toBe('production');
  });

  it('keeps staging traffic off the production project', () => {
    for (const profile of ['development', 'preview']) {
      expect(eas.build[profile].env.EXPO_PUBLIC_SUPABASE_URL)
        .not.toBe(eas.build.production.env.EXPO_PUBLIC_SUPABASE_URL);
    }
  });

  it('ships only publishable keys — no server secret reaches a build profile', () => {
    const serialized = JSON.stringify(eas.build);
    for (const secret of [
      'GOOGLE_GEMINI_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY',
      'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'SERVICE_ROLE',
    ]) {
      expect(`${secret}: ${serialized.includes(secret)}`).toBe(`${secret}: false`);
    }
    expect(serialized).not.toMatch(/sk-ant-|sk-proj-|gsk_|service_role/);
  });
});

describe('App Store submission configuration', () => {
  const ios = eas.submit.production.ios;

  it('targets the real App Store Connect record', () => {
    expect(ios.ascAppId).toBe('6806351278');
    expect(ios.appleTeamId).toBe('9Q6YL8R33R');
  });

  it('stores no Apple credential in the repository', () => {
    /*
      Submission authenticates with an App Store Connect API key supplied at run time,
      not an Apple ID and app-specific password. So there is no appleId field to leak,
      and nothing here is a secret.
    */
    expect(ios.appleId).toBeUndefined();
    expect(JSON.stringify(ios)).not.toMatch(/@|password|p8|-----BEGIN/i);
  });

  it('has no placeholder left anywhere in the submit config', () => {
    expect(JSON.stringify(eas.submit)).not.toContain('REPLACE_WITH_');
  });
});

describe('App Store review requirements', () => {
  it('still needs the legal URLs a subscription app cannot ship without', () => {
    // Apple 3.1.2 requires reachable Privacy Policy and Terms of Use links in the
    // binary. The paywall renders both and hides them while these are empty, so the
    // app is honest but not yet submittable.
    expect(missingBrandConfiguration().sort()).toEqual([
      'privacyUrl',
      'supportEmail',
      'termsUrl',
    ]);
  });

  it('lets EAS own the build number rather than a hardcoded one', () => {
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(eas.build.production.autoIncrement).toBe(true);
  });

  it('does not set an update channel while expo-updates is absent', () => {
    // A channel without expo-updates installed does nothing and only produces a
    // build warning; it would be misleading to imply OTA updates are wired up.
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const hasUpdates = Boolean(pkg.dependencies['expo-updates']);
    for (const profile of BUILD_PROFILES) {
      expect(`${profile}: ${Boolean(eas.build[profile].channel) && !hasUpdates}`)
        .toBe(`${profile}: false`);
    }
  });
});


describe('App Store Connect product configuration', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/APP_STORE.md'), 'utf8');

  const products = Object.values(DEFAULT_CATALOGUE.plans)
    .flatMap((plan) => [plan.pricing.monthly, plan.pricing.yearly])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  it('documents every purchasable product', () => {
    expect(products.length).toBe(6);
    for (const p of products) {
      expect(`${p.productId} documented: ${doc.includes(p.productId)}`)
        .toBe(`${p.productId} documented: true`);
    }
  });

  it('documents the price the catalogue actually charges', () => {
    /*
      A price typed into App Store Connect that disagrees with the catalogue produces a
      purchase that completes at one price and unlocks a plan priced at another. The doc
      is what gets typed in, so it is checked against the source of truth.
    */
    for (const p of products) {
      const major = (p.amount / 100).toFixed(2);
      expect(`${p.productId} at ${major}: ${doc.includes(major)}`)
        .toBe(`${p.productId} at ${major}: true`);
    }
  });

  it('records the confirmed Apple identifiers', () => {
    expect(doc).toContain('com.aminekammour.lifeos');
    expect(doc).toContain('6806351278');
    expect(doc).toContain('9Q6YL8R33R');
  });

  it('never promises an unlimited plan in the copy that reaches the store', () => {
    /*
      Only the suggested product descriptions are checked, not the whole document — the
      guidance text legitimately uses the word while forbidding it, and a naive scan for
      it flags that sentence instead of a real promise.
    */
    const copy = doc
      .split('\n')
      .filter((line) => /^\| (Plus|Pro|Ultra)\b/.test(line))
      .join('\n');
    expect(copy.length).toBeGreaterThan(0);
    expect(copy.toLowerCase()).not.toContain('unlimited');
  });
});
