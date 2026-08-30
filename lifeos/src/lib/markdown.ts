/**
 * A small Markdown parser for assistant replies.
 *
 * Models emit Markdown whether or not you ask them to, so a chat that renders raw
 * text shows literal `**asterisks**` and `- dashes`. This covers what actually turns
 * up in replies — headings, emphasis, code, lists, quotes, links, tables are not
 * included because the assistant is instructed not to emit them.
 *
 * Kept free of React so it can be tested as data.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'boldItalic'; text: string }
  | { type: 'strike'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'paragraph'; inlines: Inline[] }
  | { type: 'heading'; level: 1 | 2 | 3; inlines: Inline[] }
  | { type: 'listItem'; ordered: boolean; marker: string; depth: number; inlines: Inline[] }
  | { type: 'code'; text: string; lang: string | null }
  | { type: 'quote'; inlines: Inline[] }
  | { type: 'rule' };

const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const RULE = /^\s{0,3}([-*_])\s*(\1\s*){2,}$/;
const FENCE = /^\s{0,3}```\s*([A-Za-z0-9+#-]*)\s*$/;

/** Two spaces of indent is one nesting level; models are not consistent beyond that. */
function depthOf(indent: string): number {
  return Math.min(3, Math.floor(indent.replace(/\t/g, '  ').length / 2));
}

export function parseMarkdown(input: string): Block[] {
  const blocks: Block[] = [];
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    // A wrapped paragraph is one paragraph: join with spaces, not newlines.
    blocks.push({ type: 'paragraph', inlines: parseInline(paragraph.join(' ').trim()) });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const body: string[] = [];
      i += 1;
      // An unterminated fence runs to the end rather than swallowing the reply — a
      // streamed or truncated response often ends mid-block.
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code', text: body.join('\n'), lang: fence[1] || null });
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    if (RULE.test(line)) {
      flush();
      blocks.push({ type: 'rule' });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        inlines: parseInline(heading[2].trim()),
      });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flush();
      blocks.push({ type: 'quote', inlines: parseInline(quote[1].trim()) });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      blocks.push({
        type: 'listItem',
        ordered: false,
        marker: '•',
        depth: depthOf(bullet[1]),
        inlines: parseInline(bullet[3].trim()),
      });
      continue;
    }

    const ordered = ORDERED.exec(line);
    if (ordered) {
      flush();
      blocks.push({
        type: 'listItem',
        ordered: true,
        // The model's own numbering is kept: renumbering silently corrupts a reply
        // that deliberately starts at 3, or continues an earlier list.
        marker: `${ordered[2]}.`,
        depth: depthOf(ordered[1]),
        inlines: parseInline(ordered[3].trim()),
      });
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

/*
  Ordered by precedence. Code first: nothing inside a code span is formatting.

  `make` returns a list so a rule can re-emit boundary characters it had to consume.
  Lookbehind would avoid that, but Hermes is the engine on device and this is not the
  place to bet a startup crash on which assertions it supports.
*/
const INLINE_RULES: { re: RegExp; make: (m: RegExpExecArray) => Inline[] }[] = [
  { re: /`([^`\n]+)`/, make: (m) => [{ type: 'code', text: m[1] }] },
  { re: /\[([^\]\n]+)\]\(([^)\s]+)\)/, make: (m) => [{ type: 'link', text: m[1], href: m[2] }] },
  { re: /\*\*\*([^\s*][^*]*?)\*\*\*/, make: (m) => [{ type: 'boldItalic', text: m[1] }] },
  { re: /\*\*([^\s*][^*]*?)\*\*/, make: (m) => [{ type: 'bold', text: m[1] }] },
  { re: /~~([^~\n]+)~~/, make: (m) => [{ type: 'strike', text: m[1] }] },
  { re: /\*([^\s*][^*]*?)\*/, make: (m) => [{ type: 'italic', text: m[1] }] },
  {
    // Underscore emphasis only at word boundaries, so snake_case_names survive intact.
    // The boundary characters are part of the match and are handed back as text.
    re: /(^|[\s(])_([^\s_][^_]*?)_($|[\s.,;:!?)])/,
    make: (m) => [
      { type: 'text', text: m[1] },
      { type: 'italic', text: m[2] },
      { type: 'text', text: m[3] },
    ],
  },
];

export function parseInline(input: string): Inline[] {
  if (!input) return [];
  const out: Inline[] = [];
  let rest = input;

  while (rest.length > 0) {
    let best: { index: number; length: number; nodes: Inline[] } | null = null;

    for (const rule of INLINE_RULES) {
      const match = rule.re.exec(rest);
      if (!match) continue;
      // Earliest match wins; ties go to the higher-precedence rule, which is why this
      // is a strict `<` and the rules are iterated in order.
      if (!best || match.index < best.index) {
        best = { index: match.index, length: match[0].length, nodes: rule.make(match) };
      }
    }

    if (!best) {
      out.push({ type: 'text', text: rest });
      break;
    }

    if (best.index > 0) out.push({ type: 'text', text: rest.slice(0, best.index) });
    out.push(...best.nodes);
    rest = rest.slice(best.index + best.length);
  }

  // Boundary characters re-emitted by a rule leave runs of adjacent text nodes.
  // Merging them keeps the output canonical, so equal input gives equal nodes.
  const merged: Inline[] = [];
  for (const node of out) {
    if (node.type === 'text' && node.text.length === 0) continue;
    const last = merged[merged.length - 1];
    if (node.type === 'text' && last?.type === 'text') {
      merged[merged.length - 1] = { type: 'text', text: last.text + node.text };
    } else {
      merged.push(node);
    }
  }
  return merged;
}

/** Plain text of a reply — for copying, previews and accessibility labels. */
export function markdownToPlainText(input: string): string {
  return parseMarkdown(input)
    .map((block) => {
      switch (block.type) {
        case 'code':
          return block.text;
        case 'rule':
          return '';
        case 'listItem':
          return `${'  '.repeat(block.depth)}${block.marker} ${inlineText(block.inlines)}`;
        default:
          return inlineText(block.inlines);
      }
    })
    .join('\n')
    .trim();
}

function inlineText(inlines: Inline[]): string {
  return inlines.map((n) => n.text).join('');
}
