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
      const allowed = file.startsWith(adapterDir);
      expect(`${rel}: ${hit && !allowed}`).toBe(`${rel}: false`);
    }
  });

  it('has ZERO direct provider calls outside the adapters', () => {
    /*
      The final architecture rule, enforced rather than asserted in a document: no file
      in the repository may reach a provider except through an adapter. transcribe was
      the last exception and was migrated in Phase 10; this test is what stops a new one
      appearing.
    */
    const hosts = PROVIDER_NAMES.map((p) => new URL(DEFAULT_REGISTRY.providers[p].baseUrl).host);
    const extra = ['api.anthropic.com'];
    const pattern = new RegExp([...hosts, ...extra].join('|').replace(/\./g, '\\.'));

    const offenders: string[] = [];
    for (const file of walk(path.join(root, 'supabase/functions'))) {
      const rel = path.relative(root, file);
      if (rel.includes('ai/registry.ts')) continue;   // URLs as data
      if (file.startsWith(adapterDir)) continue;      // the sanctioned boundary
      if (pattern.test(fs.readFileSync(file, 'utf8'))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps fetch() to providers inside the adapter directory', () => {
    const outside = walk(aiDir).filter((f) => !f.startsWith(adapterDir));
    for (const file of outside) {
      const body = fs.readFileSync(file, 'utf8');
      expect(`${path.relative(root, file)}: ${/\bfetch\s*\(/.test(body)}`)
        .toBe(`${path.relative(root, file)}: false`);
    }
  });

  it('reads private configuration with the service role, never the caller', () => {
    /*
      app_config's RLS exposes only rows with is_public = true to an authenticated user.
      ai_policy and ai_registry are private, so a user-scoped read returns nothing and
      falls back to the defaults — leaving the router switched off however the row is
      set, with no error anywhere. This shipped, and the only symptom was an assistant
      that stayed unreachable after the config said otherwise.
    */
    for (const fn of ['ai-chat', 'daily-brief', 'transcribe']) {
      const body = fs.readFileSync(
        path.join(root, `supabase/functions/${fn}/index.ts`), 'utf8',
      );
      for (const call of ['loadPolicy', 'loadRegistry', 'loadHealth']) {
        expect(`${fn}: ${call}(db)`).not.toBe(`${fn}: ${body.includes(`${call}(db)`) ? `${call}(db)` : 'absent'}`);
      }
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
