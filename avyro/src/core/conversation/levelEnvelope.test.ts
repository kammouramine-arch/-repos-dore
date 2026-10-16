import { initialLevelEnvelope, stepLevelEnvelope, type LevelEnvelopeState } from './levelEnvelope';

/** Feeds levels at the native rate (~8 Hz). */
const feed = (levels: number[], from: LevelEnvelopeState = initialLevelEnvelope) => {
  const out: number[] = [];
  let state = from;
  for (const level of levels) {
    state = stepLevelEnvelope(state, level, 125);
    out.push(state.value);
  }
  return { out, state };
};

describe('the "I hear you" envelope', () => {
  it('stays dark in silence', () => {
    expect(Math.max(...feed(Array(40).fill(0.05)).out)).toBeLessThan(0.01);
  });

  it('learns steady road noise as the new zero', () => {
    // A loud, steady cabin (0.45) for 15 s: after settling, the edge is quiet.
    const { out } = feed(Array(120).fill(0.45));
    expect(out.at(-1)!).toBeLessThan(0.05);
  });

  it('still lights up for a voice above that road noise', () => {
    const settled = feed(Array(120).fill(0.45)).state;
    const { out } = feed([0.8, 0.85, 0.8], settled);
    expect(out.at(-1)!).toBeGreaterThan(0.4);
  });

  it('responds fast to a word and lets go gently between words', () => {
    const { out } = feed([0.05, 0.05, 0.7, 0.7, 0.05, 0.05, 0.05]);
    expect(out[2]).toBeGreaterThan(0.5); // onset within one update
    expect(out[4]).toBeGreaterThan(out[5]); // decaying…
    expect(out[4]).toBeGreaterThan(0.3); // …but not snapping to zero
  });

  it('ignores garbage input', () => {
    expect(feed([NaN, -3, 7]).out.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});
