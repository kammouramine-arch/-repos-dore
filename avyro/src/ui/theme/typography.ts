import type { TextStyle } from 'react-native';

/**
 * One type scale for the whole app, modelled on the platform's own — San
 * Francisco on iOS, Roboto on Android. Large sizes get negative tracking,
 * which is what makes big type read as designed rather than as scaled up.
 */
export const typography = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  title1: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  title2: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  title3: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.4 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '500', letterSpacing: -0.2 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: -0.1 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  /** Distance-to-maneuver in the guidance banner: glanceable at arm's length. */
  maneuver: { fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -1 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;
