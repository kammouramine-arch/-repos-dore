import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { markdownToPlainText, parseInline, parseMarkdown } from '@/lib/markdown';

describe('inline markdown', () => {
  it('renders bold, italic and code as distinct nodes', () => {
    expect(parseInline('a **b** c *d* e `f`')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', text: 'b' },
      { type: 'text', text: ' c ' },
      { type: 'italic', text: 'd' },
      { type: 'text', text: ' e ' },
      { type: 'code', text: 'f' },
    ]);
  });

  it('does not format inside a code span', () => {
    expect(parseInline('`**not bold**`')).toEqual([{ type: 'code', text: '**not bold**' }]);
  });

  it('leaves snake_case identifiers alone', () => {
    expect(parseInline('the life_area_key column')).toEqual([
      { type: 'text', text: 'the life_area_key column' },
    ]);
  });

  it('still italicises a properly delimited underscore span', () => {
    expect(parseInline('be _honest_ here')).toEqual([
      { type: 'text', text: 'be ' },
      { type: 'italic', text: 'honest' },
      { type: 'text', text: ' here' },
    ]);
  });

  it('parses links', () => {
    expect(parseInline('see [plans](/paywall)')).toEqual([
      { type: 'text', text: 'see ' },
      { type: 'link', text: 'plans', href: '/paywall' },
    ]);
  });

  it('treats a lone asterisk as text rather than opening emphasis', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([{ type: 'text', text: '2 * 3 = 6' }]);
  });

  it('uses no lookbehind, which Hermes may not support', () => {
    // Guards the regexes themselves: a lookbehind here would throw on device long
    // before any test could catch the formatting being wrong.
    const source = readFileSync(join(__dirname, '../src/lib/markdown.ts'), 'utf8');
    expect(source).not.toMatch(/\(\?<[=!]/);
  });
});

describe('block markdown', () => {
  it('joins a wrapped paragraph into one block', () => {
    expect(parseMarkdown('one line\nstill the same')).toEqual([
      { type: 'paragraph', inlines: [{ type: 'text', text: 'one line still the same' }] },
    ]);
  });

  it('separates paragraphs on a blank line', () => {
    expect(parseMarkdown('first\n\nsecond')).toHaveLength(2);
  });

  it('parses headings by level', () => {
    const blocks = parseMarkdown('# One\n## Two\n### Three');
    expect(blocks.map((b) => b.type === 'heading' && b.level)).toEqual([1, 2, 3]);
  });

  it('parses bullets and keeps the model own numbering', () => {
    const blocks = parseMarkdown('- alpha\n3. beta');
    expect(blocks).toEqual([
      { type: 'listItem', ordered: false, marker: '•', depth: 0, inlines: [{ type: 'text', text: 'alpha' }] },
      { type: 'listItem', ordered: true, marker: '3.', depth: 0, inlines: [{ type: 'text', text: 'beta' }] },
    ]);
  });

  it('tracks nesting depth by indentation', () => {
    const blocks = parseMarkdown('- top\n  - nested\n    - deeper');
    expect(blocks.map((b) => b.type === 'listItem' && b.depth)).toEqual([0, 1, 2]);
  });

  it('keeps code fences verbatim', () => {
    const blocks = parseMarkdown('```ts\nconst a = 1;\n\nconst b = 2;\n```');
    expect(blocks).toEqual([{ type: 'code', text: 'const a = 1;\n\nconst b = 2;', lang: 'ts' }]);
  });

  it('does not swallow the reply when a fence is never closed', () => {
    // A truncated or interrupted response ends mid-block; the text must still show.
    const blocks = parseMarkdown('before\n\n```\nunterminated');
    expect(blocks).toEqual([
      { type: 'paragraph', inlines: [{ type: 'text', text: 'before' }] },
      { type: 'code', text: 'unterminated', lang: null },
    ]);
  });

  it('parses quotes and rules', () => {
    expect(parseMarkdown('> quoted\n\n---').map((b) => b.type)).toEqual(['quote', 'rule']);
  });

  it('returns nothing for empty input', () => {
    expect(parseMarkdown('')).toEqual([]);
  });
});

describe('markdownToPlainText', () => {
  it('strips formatting so copied text is clean', () => {
    expect(markdownToPlainText('## Plan\n\nDo **this** and `that`.\n\n- step one')).toBe(
      'Plan\nDo this and that.\n• step one',
    );
  });
});
