import type { ManeuverType } from '@/core/domain/entities/route';
import { glyphFor, glyphTransform } from './maneuverGlyphs';

/** Applies an SVG `matrix(a b c d e f)` to a point. */
const apply = (transform: string, x: number, y: number) => {
  const [a, b, c, d, e, f] = transform.replace(/^matrix\(|\)$/g, '').split(/\s+/).map(Number);
  return { x: a * x + c * y + e, y: b * x + d * y + f };
};

/** Where an arrow's tip ends up: right of centre is a right turn. */
const tipX = (maneuver: ManeuverType) => {
  const { glyph, mirrored } = glyphFor(maneuver);
  // The arrowhead is the last path; its widest x is the point of the arrow.
  const head = glyph.paths.at(-1) ?? '';
  const numbers = head.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const absX = [numbers[0], numbers[2]];
  const xs = absX.map((x) => apply(glyphTransform(mirrored), x, 0).x);
  return mirrored ? Math.min(...xs) : Math.max(...xs);
};

describe('maneuver arrows point the way the instruction says', () => {
  it.each(['turn-right', 'slight-right', 'sharp-right'] as const)('%s points right', (m) => {
    expect(tipX(m)).toBeGreaterThan(12);
  });

  it.each(['turn-left', 'slight-left', 'sharp-left'] as const)('%s points left', (m) => {
    expect(tipX(m)).toBeLessThan(12);
  });
});

describe('the transform is always explicit', () => {
  it('spells out the identity for an unmirrored glyph', () => {
    // undefined would leave iOS drawing the previous step's mirror.
    expect(glyphTransform(false)).toBe('matrix(1 0 0 1 0 0)');
  });

  it('a left after a right after a left never inherits state', () => {
    const sequence: ManeuverType[] = ['turn-left', 'turn-right', 'turn-right', 'slight-left'];
    const transforms = sequence.map((m) => glyphTransform(glyphFor(m).mirrored));
    expect(transforms.every((value) => typeof value === 'string' && value.length > 0)).toBe(true);
    expect(transforms[1]).not.toBe(transforms[0]);
  });
});
