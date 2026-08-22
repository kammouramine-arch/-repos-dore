import fs from 'fs';
import path from 'path';
import { brand, brandLink, missingBrandConfiguration, supportAddress } from '@/config/brand';
import { DEFAULT_CATALOGUE } from '@shared/plans';

/**
 * Brand integrity.
 *
 * One identity, defined once, with no leftovers from an earlier name and no links
 * pointing at somewhere that does not exist. These assertions are what stop a rename
 * from being half-done.
 */

const root = path.resolve(__dirname, '..');

function sources(dirs: string[], extensions = /\.(ts|tsx|sql|mjs|js)$/): { file: string; body: string }[] {
  const found: { file: string; body: string }[] = [];

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.test(entry.name)) {
        found.push({ file: path.relative(root, full), body: fs.readFileSync(full, 'utf8') });
      }
    }
  };

  for (const dir of dirs) walk(path.join(root, dir));
  return found;
}

describe('identity', () => {
  it('is LifeOS, with its positioning', () => {
    expect(brand.name).toBe('LifeOS');
    expect(brand.tagline).toBe('Your AI Operating System for Life.');
    expect(brand.aiName).toBe('LifeOS');
    expect(brand.positioning.length).toBeGreaterThan(10);
  });

  it('derives the scheme, slug and identifiers from the same name', () => {
    const slug = brand.name.toLowerCase();
    expect(brand.slug).toBe(slug);
    expect(brand.scheme).toBe(slug);
    expect(brand.storageNamespace).toBe(slug);
    expect(brand.productPrefix).toBe(slug);
    expect(brand.bundleIdentifier).toContain(slug);
    expect(brand.androidPackage).toBe(brand.bundleIdentifier);
  });

  it('names every store product from the brand', () => {
    for (const tier of DEFAULT_CATALOGUE.order) {
      const plan = DEFAULT_CATALOGUE.plans[tier];
      for (const period of ['monthly', 'yearly'] as const) {
        const price = plan.pricing[period];
        if (!price) continue;
        expect(price.productId).toBe(`${brand.productPrefix}.${tier}.${period}`);
      }
    }
  });
});

describe('no leftovers from the previous name', () => {
  const previous = /meridian/i;

  it('has no trace in the app, the functions, the migrations or the scripts', () => {
    for (const { file, body } of sources(['app', 'src', 'supabase', 'scripts'])) {
      expect(`${file}: ${previous.test(body)}`).toBe(`${file}: false`);
    }
  });

  it('has no trace in the configuration or documentation', () => {
    const files = ['app.config.ts', 'eas.json', 'README.md', '.env.example'];
    for (const file of files) {
      const body = fs.readFileSync(path.join(root, file), 'utf8');
      expect(`${file}: ${previous.test(body)}`).toBe(`${file}: false`);
    }

    for (const { file, body } of sources(['docs'], /\.md$/)) {
      expect(`${file}: ${previous.test(body)}`).toBe(`${file}: false`);
    }
  });

  it('never calls itself an "AI Life Planner" any more', () => {
    for (const { file, body } of sources(['app', 'src', 'docs'], /\.(ts|tsx|md)$/)) {
      expect(`${file}: ${/AI Life Planner/i.test(body)}`).toBe(`${file}: false`);
    }
  });
});

describe('nothing points at a placeholder', () => {
  it('has no example.com anywhere a user could tap', () => {
    for (const { file, body } of sources(['app', 'src', 'supabase', 'scripts'])) {
      // The sign-in form's e-mail *hint* is the one legitimate use.
      const hits = [...body.matchAll(/example\.com/g)];
      const legitimate = body.includes('placeholder="you@example.com"');
      expect(`${file}: ${hits.length > 0 && !legitimate}`).toBe(`${file}: false`);
    }
  });

  it('offers a link only once it actually leads somewhere', () => {
    // Unset today, so nothing is rendered rather than rendering a dead link.
    expect(brandLink('privacyUrl')).toBeNull();
    expect(brandLink('termsUrl')).toBeNull();
    expect(supportAddress()).toBeNull();
  });

  it('lists exactly what is still missing, for the release check to refuse on', () => {
    expect(missingBrandConfiguration().sort()).toEqual([
      'privacyUrl',
      'supportEmail',
      'termsUrl',
    ]);
  });

  it('never opens an unconfigured link in the UI', () => {
    for (const { file, body } of sources(['app'], /\.tsx$/)) {
      // Every openURL of a brand link must be guarded by brandLink()/supportAddress().
      const raw = /Linking\.openURL\(\s*brand\.(privacyUrl|termsUrl|supportEmail)/.test(body);
      expect(`${file}: ${raw}`).toBe(`${file}: false`);
    }
  });
});

describe('one source of truth', () => {
  it('keeps the product name out of hardcoded strings in screens', () => {
    for (const { file, body } of sources(['app', 'src/components'], /\.tsx$/)) {
      // A literal "LifeOS" in a screen means the name was not read from config.
      const literals = [...body.matchAll(/["'`][^"'`\n]*\bLifeOS\b[^"'`\n]*["'`]/g)];
      expect(`${file}: ${literals.length}`).toBe(`${file}: 0`);
    }
  });

  it('exposes the assistant name to the server through configuration', () => {
    const fn = fs.readFileSync(
      path.join(root, 'supabase/functions/ai-chat/index.ts'),
      'utf8',
    );
    expect(fn).toContain("Deno.env.get('AI_NAME')");
  });
});
