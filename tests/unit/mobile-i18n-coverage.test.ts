import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { localizeText } from '../../mobile/src/lib/i18n';

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}
const FRENCH = /[éèêàçùôîâ]|\b(devis|le|la|les|des|un|une|vos|votre|pas|sur|pour|avec|et)\b/i;
/**
 * Chaque libellé français écrit en dur dans les écrans mobiles doit avoir une
 * traduction anglaise : sinon l'interface anglaise mélange les deux langues.
 */
describe('mobile English coverage', () => {
  it('translates every French literal used by the screens', () => {
    const root = join(__dirname, '..', '..', 'mobile');
    const files = [...walk(join(root, 'app')), ...walk(join(root, 'src'))].filter((f) => !f.endsWith('i18n.ts'));
    const misses = new Map<string, string[]>();
    const propRe = /\b(title|label|subtitle|hint|placeholder|description|eyebrow|footer|accessibilityLabel)=["']([^"']{3,})["']/g;
    const childRe = /<(Caption|Body|Muted|Heading|Title|Text|Label)\b[^>]*>([^<{]{3,}?)<\/\1>/g;
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const re of [propRe, childRe]) {
        for (const m of src.matchAll(re)) {
          const text = m[2].trim();
          if (!FRENCH.test(text)) continue;
          if (localizeText('en', text) !== text) continue;
          const key = file.replace(root + '/', '');
          misses.set(key, [...(misses.get(key) ?? []), text]);
        }
      }
    }
    const report = [...misses].map(([file, texts]) => `${file}: ${[...new Set(texts)].join(' | ')}`).join('\n');
    expect(report, report).toBe('');
  });
});
