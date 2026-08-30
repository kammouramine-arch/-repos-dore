/**
 * How the app finds its backend.
 *
 * A TestFlight build shipped unusable because the manifest was the only source of the
 * Supabase URL and it came back empty on device. These tests pin the redundancy that
 * replaced it, and the build-time guard that stops such a binary being produced at all.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

const INLINED = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://inlined.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'inlined-key',
};
const MANIFEST = {
  supabaseUrl: 'https://manifest.supabase.co',
  supabaseAnonKey: 'manifest-key',
};

/** Loads env.ts fresh with a chosen manifest and process.env. */
function loadEnv(options: { manifest?: Record<string, unknown> | null; processEnv?: Record<string, string> }) {
  let mod: typeof import('@/config/env');
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: options.manifest === null ? null : { extra: options.manifest } },
    }));
    for (const key of Object.keys(INLINED)) delete process.env[key];
    delete process.env.EXPO_PUBLIC_ANALYTICS_ENABLED;
    Object.assign(process.env, options.processEnv ?? {});
    // Re-imported inside isolateModules so each case sees its own mock and env.
    // A static import would bind once and every case after the first would be stale.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/config/env');
  });
  return mod!;
}

const saved = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(INLINED)) delete process.env[key];
  delete process.env.EXPO_PUBLIC_ANALYTICS_ENABLED;
  Object.assign(process.env, saved);
  jest.resetModules();
});

describe('reading the backend configuration', () => {
  it('uses the inlined values when both sources are present', () => {
    const env = loadEnv({ manifest: MANIFEST, processEnv: INLINED });
    expect(env.env.supabaseUrl).toBe(INLINED.EXPO_PUBLIC_SUPABASE_URL);
    expect(env.env.supabaseAnonKey).toBe(INLINED.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    expect(env.configSource).toBe('inlined');
    expect(env.isSupabaseConfigured).toBe(true);
  });

  it('falls back to the manifest when nothing was inlined', () => {
    const env = loadEnv({ manifest: MANIFEST });
    expect(env.env.supabaseUrl).toBe(MANIFEST.supabaseUrl);
    expect(env.env.supabaseAnonKey).toBe(MANIFEST.supabaseAnonKey);
    expect(env.configSource).toBe('manifest');
    expect(env.isSupabaseConfigured).toBe(true);
  });

  it('still works when the manifest is missing entirely', () => {
    // The exact failure from TestFlight: no manifest at runtime. The inlined values
    // are baked into the bundle and do not depend on it.
    const env = loadEnv({ manifest: null, processEnv: INLINED });
    expect(env.env.supabaseUrl).toBe(INLINED.EXPO_PUBLIC_SUPABASE_URL);
    expect(env.isSupabaseConfigured).toBe(true);
    expect(env.configSource).toBe('inlined');
  });

  it('treats an empty inlined value as absent and uses the manifest', () => {
    const env = loadEnv({
      manifest: MANIFEST,
      processEnv: { EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '' },
    });
    expect(env.env.supabaseUrl).toBe(MANIFEST.supabaseUrl);
    expect(env.configSource).toBe('manifest');
  });

  it('reports unconfigured only when both sources are empty', () => {
    const env = loadEnv({ manifest: {} });
    expect(env.isSupabaseConfigured).toBe(false);
    expect(env.configSource).toBe('none');
    expect(env.missingConfigMessage).toContain('EXPO_PUBLIC_SUPABASE_URL');
  });

  it('never reports configured on a URL alone', () => {
    const env = loadEnv({ manifest: { supabaseUrl: MANIFEST.supabaseUrl } });
    expect(env.isSupabaseConfigured).toBe(false);
  });

  it('lets the inlined analytics flag override the manifest', () => {
    const off = loadEnv({
      manifest: { analyticsEnabled: true },
      processEnv: { EXPO_PUBLIC_ANALYTICS_ENABLED: 'false' },
    });
    expect(off.env.analyticsEnabled).toBe(false);
    const on = loadEnv({ manifest: { analyticsEnabled: false } });
    expect(on.env.analyticsEnabled).toBe(false);
  });
});

describe('the source code the bundler has to see', () => {
  const source = fs.readFileSync(path.join(root, 'src/config/env.ts'), 'utf8');
  /*
    Comments are stripped before checking for a dynamic lookup: the file explains why
    `process.env` with a computed key does not work, and scanning the raw text flags
    that explanation instead of real code.
  */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('references each variable literally, so babel can inline it', () => {
    /*
      babel-preset-expo replaces literal `process.env.EXPO_PUBLIC_*` member expressions
      while bundling. A dynamic `process.env[name]` is left alone and reads nothing in a
      release build — the redundancy would look present and do nothing.
    */
    expect(code).toContain('process.env.EXPO_PUBLIC_SUPABASE_URL');
    expect(code).toContain('process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(code).not.toMatch(/process\.env\[/);
  });

  it('keeps the manifest as a fallback rather than replacing it', () => {
    expect(code).toContain('Constants.expoConfig?.extra');
  });
});

describe('the production build guard', () => {
  const source = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');

  it('refuses any EAS build with no backend', () => {
    expect(source).toContain("process.env.EAS_BUILD === 'true'");
    expect(source).toContain('Refusing to build without');
  });

  it('does not key the guard on a variable the env block supplies', () => {
    /*
      The regression this exists for: the guard used to test APP_ENV === 'production',
      and APP_ENV lived in the same eas.json env block as the Supabase variables. When
      that block supplied nothing, APP_ENV was absent too, the guard was skipped, and a
      broken IPA reached TestFlight. EAS_BUILD is set by the build worker and cannot be
      switched off from eas.json.
    */
    expect(source).not.toMatch(/APP_ENV === 'production'[\s\S]{0,120}Refusing/);
  });

  it('guards only real builds, so tests and dev servers still evaluate the config', () => {
    // This suite evaluates app.config.ts indirectly and would fail if the guard were
    // unconditional — which is the point of asserting it.
    expect(source).not.toMatch(/^if \(!\(supabaseUrl && supabaseAnonKey\)\) \{/m);
  });

  it('names both variables and where they now live', () => {
    expect(source).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(source).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(source).toContain('eas env:list');
  });
});
