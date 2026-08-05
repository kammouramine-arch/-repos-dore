import type { ManeuverType } from '@/core/domain/entities/route';

export interface ManeuverGlyph {
  /** Stroked paths, drawn on a 24 × 24 grid with round caps. */
  paths: string[];
  circles?: { cx: number; cy: number; r: number; filled?: boolean }[];
}

/**
 * Maneuver arrows, drawn rather than imported.
 *
 * Icon fonts do not carry a full turn set, and a driver reads these at a
 * glance — so they are vectors on a shared grid, with a single stroke weight.
 * Left-hand turns reuse the right-hand geometry mirrored, which guarantees the
 * pair stays symmetrical.
 */
const GLYPHS = {
  straight: { paths: ['M12 20.5V7.4', 'M6.8 12.2 12 7l5.2 5.2'] },
  slightRight: { paths: ['M9 20.5v-6.2L15 8.3', 'M10.6 8.3H15v4.4'] },
  turnRight: { paths: ['M8 20.5v-6.6A3.4 3.4 0 0 1 11.4 10.5H16.4', 'M13.4 7.5 16.8 10.9l-3.4 3.4'] },
  sharpRight: {
    paths: ['M8 20.5v-8.2a3 3 0 0 1 3-3h1.4l4.3 4.3', 'M16.7 9V13.3H12.4'],
  },
  uturn: { paths: ['M8.5 20.5v-8.2a4 4 0 0 1 8 0v3.7', 'M13.3 12.6 16.5 15.8l3.2-3.2'] },
  roundabout: {
    paths: ['M12.5 20.5v-5.6', 'M16.9 10.5H20', 'M17.4 7.9 20 10.5l-2.6 2.6'],
    circles: [{ cx: 12.5, cy: 10.5, r: 4.3 }],
  },
  merge: {
    paths: ['M15 20.5V8.4', 'M11.4 12 15 8.4l3.6 3.6', 'M9 20.5v-4.6a4 4 0 0 1 4-4h1'],
  },
  fork: {
    paths: ['M12 20.5v-4.8', 'M12 15.7 8.2 11.9', 'M12 15.7l4.3-4.3', 'M11.9 11.4h4.4v4.4'],
  },
  ramp: {
    paths: ['M8 20.5v-4.6C8 10.6 11.8 7.5 16.6 7.5', 'M13.3 4.2 16.6 7.5l-3.3 3.3'],
  },
  arrive: {
    paths: ['M12 21.2c0 0-6.4-7-6.4-10.8a6.4 6.4 0 1 1 12.8 0C18.4 14.2 12 21.2 12 21.2z'],
    circles: [{ cx: 12, cy: 10.4, r: 2.4, filled: true }],
  },
} satisfies Record<string, ManeuverGlyph>;

type GlyphName = keyof typeof GLYPHS;

const BY_MANEUVER: Record<ManeuverType, { glyph: GlyphName; mirrored?: boolean }> = {
  depart: { glyph: 'straight' },
  straight: { glyph: 'straight' },
  'slight-right': { glyph: 'slightRight' },
  'slight-left': { glyph: 'slightRight', mirrored: true },
  'turn-right': { glyph: 'turnRight' },
  'turn-left': { glyph: 'turnRight', mirrored: true },
  'sharp-right': { glyph: 'sharpRight' },
  'sharp-left': { glyph: 'sharpRight', mirrored: true },
  uturn: { glyph: 'uturn' },
  roundabout: { glyph: 'roundabout' },
  merge: { glyph: 'merge' },
  fork: { glyph: 'fork' },
  ramp: { glyph: 'ramp' },
  arrive: { glyph: 'arrive' },
};

export const glyphFor = (
  maneuver: ManeuverType,
): { glyph: ManeuverGlyph; mirrored: boolean } => {
  const entry = BY_MANEUVER[maneuver] ?? BY_MANEUVER.straight;
  return { glyph: GLYPHS[entry.glyph], mirrored: entry.mirrored ?? false };
};
