/** Phrase-addressed narration timing: every animation keys off what is actually spoken. */
export type Tok = { w: string; s: number; e: number };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function makeCues(tokens: Tok[]) {
  const ws = tokens.map((t) => ({ ...t, n: norm(t.w) }));
  const find = (phrase: string, after = 0) => {
    const p = phrase.split(/\s+/).map(norm).filter(Boolean);
    for (let i = 0; i < ws.length; i++) {
      if (ws[i].s < after - 1e-6) continue;
      let ok = true;
      for (let j = 0; j < p.length; j++) if (!ws[i + j] || ws[i + j].n !== p[j]) { ok = false; break; }
      if (ok) return { s: ws[i].s, e: ws[i + p.length - 1].e };
    }
    throw new Error(`cue not found: "${phrase}" after ${after}`);
  };
  /** start time of phrase */
  const at = (phrase: string, after = 0) => find(phrase, after).s;
  /** end time of phrase */
  const end = (phrase: string, after = 0) => find(phrase, after).e;
  /** sequential lookup: each call searches after the previous match (narration order) */
  let cursor = 0;
  const seq = (phrase: string) => {
    const r = find(phrase, cursor);
    cursor = r.s + 0.01;
    return r.s;
  };
  return { at, end, seq };
}
