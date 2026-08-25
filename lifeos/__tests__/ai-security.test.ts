import fs from 'fs';
import path from 'path';
import { DEFAULT_REGISTRY, PROVIDER_NAMES } from '@shared/ai/registry';
import { AGENT_KEYS } from '@shared/agents';

const root = path.resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const clientFiles = [
  ...walk(path.join(root, 'src')),
  ...(fs.existsSync(path.join(root, 'app')) ? walk(path.join(root, 'app')) : []),
];

describe('provider keys never reach the client', () => {
  const secretNames = PROVIDER_NAMES.map((p) => DEFAULT_REGISTRY.providers[p].apiKeyEnvVar);

  it('names a distinct environment variable per provider', () => {
    expect(new Set(secretNames).size).toBe(secretNames.length);
  });

  it('keeps every provider key name out of app code', () => {
    const pattern = new RegExp(secretNames.join('|'));
    for (const file of clientFiles) {
      const body = fs.readFileSync(file, 'utf8');
      expect(`${path.relative(root, file)}: ${pattern.test(body)}`)
        .toBe(`${path.relative(root, file)}: false`);
    }
  });

  it('keeps provider key material patterns out of app code', () => {
    // Prefixes used by the four providers' keys, so a pasted key fails the build.
    const keyish = /sk-proj-|sk-ant-|AIzaSy|gsk_[A-Za-z0-9]{20}/;
    for (const file of clientFiles) {
      const body = fs.readFileSync(file, 'utf8');
      expect(`${path.relative(root, file)}: ${keyish.test(body)}`)
        .toBe(`${path.relative(root, file)}: false`);
    }
  });

  it('never exposes a provider base URL to the client bundle', () => {
    const hosts = PROVIDER_NAMES.map((p) => new URL(DEFAULT_REGISTRY.providers[p].baseUrl).host);
    const pattern = new RegExp(hosts.join('|').replace(/\./g, '\\.'));
    for (const file of clientFiles) {
      const body = fs.readFileSync(file, 'utf8');
      expect(`${path.relative(root, file)}: ${pattern.test(body)}`)
        .toBe(`${path.relative(root, file)}: false`);
    }
  });
});

describe('no agent or feature reaches a provider directly', () => {
  const aiDir = path.join(root, 'supabase/functions/_shared/ai');
  const adapterDir = path.join(aiDir, 'adapters');

  /*
    Paths that still talk to a provider without going through the router. Each one is a
    scheduled migration step, listed here so the exception is visible and the list can
    only shrink — a new file reaching a provider directly fails this test immediately.
  */
  const PRE_ROUTER_PATHS = [
    // Phase 10: transcription moves to capability-based routing (Groq Whisper).
    'supabase/functions/transcribe/index.ts',
  ];

  it('confines every provider hostname to the adapters', () => {
    const hosts = PROVIDER_NAMES.map((p) => new URL(DEFAULT_REGISTRY.providers[p].baseUrl).host);
    const pattern = new RegExp(hosts.join('|').replace(/\./g, '\\.'));
    const serverFiles = walk(path.join(root, 'supabase/functions'));
    for (const file of serverFiles) {
      const rel = path.relative(root, file);
      // The registry holds the URLs as data; the adapters are the only code that calls them.
      if (rel.includes('ai/registry.ts')) continue;
      const body = fs.readFileSync(file, 'utf8');
      const hit = pattern.test(body);
      const allowed = file.startsWith(adapterDir) || PRE_ROUTER_PATHS.includes(rel);
      expect(`${rel}: ${hit && !allowed}`).toBe(`${rel}: false`);
    }
  });

  it('has not grown the list of pre-router paths', () => {
    // If this number goes up, something bypassed the router. If it goes down, a phase
    // landed. Either way it should be a deliberate edit, not a silent drift.
    expect(PRE_ROUTER_PATHS).toHaveLength(1);
    for (const rel of PRE_ROUTER_PATHS) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true);
    }
  });

  it('keeps fetch() to providers inside the adapter directory', () => {
    const outside = walk(aiDir).filter((f) => !f.startsWith(adapterDir));
    for (const file of outside) {
      const body = fs.readFileSync(file, 'utf8');
      expect(`${path.relative(root, file)}: ${/\bfetch\s*\(/.test(body)}`)
        .toBe(`${path.relative(root, file)}: false`);
    }
  });

  it('covers all six LifeOS agents with one router', () => {
    expect(AGENT_KEYS.sort()).toEqual(
      ['business', 'career', 'fitness', 'finance', 'learning', 'life'].sort(),
    );
  });
});

describe('registry diagnostics leak nothing', () => {
  it('holds no key material in the registry itself', () => {
    const body = JSON.stringify(DEFAULT_REGISTRY);
    expect(body).not.toMatch(/sk-|AIzaSy|gsk_/);
    // Only the variable names are stored, never their values.
    for (const p of PROVIDER_NAMES) {
      expect(DEFAULT_REGISTRY.providers[p].apiKeyEnvVar).toMatch(/^[A-Z_]+$/);
    }
  });
});
