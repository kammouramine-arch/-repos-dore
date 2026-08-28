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

  it('declares the three fields eas submit needs', () => {
    for (const key of ['appleId', 'ascAppId', 'appleTeamId']) {
      expect(Object.keys(ios)).toContain(key);
    }
  });

  /*
    Pinned rather than asserted-absent: these three values can only come from the Apple
    account holder. Listing them keeps them visible, and the test fails the moment one
    is filled in — which is the prompt to fill in the rest and delete this test.
  */
  it('still needs these values from the Apple account holder', () => {
    const outstanding = Object.entries(ios)
      .filter(([, v]) => typeof v === 'string' && v.startsWith('REPLACE_WITH_'))
      .map(([k]) => k)
      .sort();
    expect(outstanding).toEqual(['appleId', 'appleTeamId', 'ascAppId']);
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
