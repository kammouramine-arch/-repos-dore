/**
 * Design tokens. Two palettes (light / dark) exposing the same semantic names, so
 * components never branch on colour scheme themselves.
 */
export type ColorScheme = 'light' | 'dark';

const palette = {
  ink900: '#0E1014',
  ink800: '#161A21',
  ink700: '#1E232C',
  ink600: '#2A3039',
  slate500: '#5C6472',
  slate400: '#7C8494',
  slate300: '#A6ADBA',
  mist200: '#DFE1E6',
  mist100: '#ECEDF0',
  paper: '#FAF9F7',
  white: '#FFFFFF',

  indigo600: '#4A54C9',
  indigo500: '#5B63E8',
  indigo400: '#7E85F0',
  indigo300: '#A9AEF6',
  indigo050: '#EEEFFE',

  sand600: '#B27A34',
  sand500: '#D19A4E',
  sand100: '#FBF1E2',

  green600: '#2E7D5B',
  green500: '#3F9E74',
  green100: '#E6F4ED',

  amber600: '#B4801E',
  amber500: '#D69B2D',

  rose600: '#B3444E',
  rose500: '#D45B66',
  rose100: '#FBEBEC',
};

export type ThemeColors = {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  accentText: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warning: string;
  danger: string;
  dangerSoft: string;
  highlight: string;
  highlightSoft: string;
  overlay: string;
  skeleton: string;
};

export const lightColors: ThemeColors = {
  background: palette.paper,
  backgroundElevated: palette.white,
  surface: palette.white,
  surfaceAlt: '#F3F2EF',
  surfaceSunken: '#EFEEEA',
  border: '#E6E4DF',
  borderStrong: '#D6D3CC',
  text: palette.ink900,
  textSecondary: palette.slate500,
  textTertiary: palette.slate400,
  textInverse: palette.white,
  accent: palette.indigo500,
  accentPressed: palette.indigo600,
  accentSoft: palette.indigo050,
  accentText: palette.indigo600,
  onAccent: palette.white,
  success: palette.green600,
  successSoft: palette.green100,
  warning: palette.amber600,
  danger: palette.rose600,
  dangerSoft: palette.rose100,
  highlight: palette.sand600,
  highlightSoft: palette.sand100,
  overlay: 'rgba(14,16,20,0.42)',
  skeleton: '#E9E7E2',
};

export const darkColors: ThemeColors = {
  background: palette.ink900,
  backgroundElevated: palette.ink800,
  surface: palette.ink800,
  surfaceAlt: palette.ink700,
  surfaceSunken: '#12151B',
  border: '#252A33',
  borderStrong: '#333A46',
  text: '#F3F4F7',
  textSecondary: palette.slate300,
  textTertiary: palette.slate400,
  textInverse: palette.ink900,
  accent: palette.indigo400,
  accentPressed: palette.indigo300,
  accentSoft: 'rgba(126,133,240,0.14)',
  accentText: palette.indigo300,
  onAccent: palette.ink900,
  success: palette.green500,
  successSoft: 'rgba(63,158,116,0.16)',
  warning: palette.amber500,
  danger: palette.rose500,
  dangerSoft: 'rgba(212,91,102,0.16)',
  highlight: palette.sand500,
  highlightSoft: 'rgba(209,154,78,0.14)',
  overlay: 'rgba(0,0,0,0.62)',
  skeleton: '#1D222A',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
  huge: 64,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Type scale. `weight` values are strings because RN expects them that way. */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, fontWeight: '600' as const },
  title1: { fontSize: 27, lineHeight: 33, letterSpacing: -0.5, fontWeight: '600' as const },
  title2: { fontSize: 21, lineHeight: 27, letterSpacing: -0.3, fontWeight: '600' as const },
  title3: { fontSize: 17, lineHeight: 23, letterSpacing: -0.2, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '600' as const },
  callout: { fontSize: 15, lineHeight: 21, letterSpacing: -0.1, fontWeight: '400' as const },
  subhead: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '500' as const },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 1.1, fontWeight: '700' as const },
} as const;

export type TypeVariant = keyof typeof typography;

export const elevation = (scheme: ColorScheme) =>
  scheme === 'light'
    ? {
        card: {
          shadowColor: '#20222B',
          shadowOpacity: 0.07,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        },
        raised: {
          shadowColor: '#20222B',
          shadowOpacity: 0.12,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
          elevation: 8,
        },
      }
    : {
        card: {
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        },
        raised: {
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
          elevation: 8,
        },
      };

/** Life-area colours, deliberately muted so a full Life Map still looks calm. */
export const areaPalette: Record<string, { light: string; dark: string }> = {
  health: { light: '#3F9E74', dark: '#63BB93' },
  career: { light: '#4A54C9', dark: '#8A92F2' },
  money: { light: '#B27A34', dark: '#D6A05C' },
  relationships: { light: '#B3596B', dark: '#DE8296' },
  family: { light: '#9A5BB0', dark: '#C08FD3' },
  growth: { light: '#2F7D8C', dark: '#5FAFBE' },
  learning: { light: '#3D6FB5', dark: '#7BA6DE' },
  business: { light: '#5C6472', dark: '#98A1B2' },
  social: { light: '#C1743F', dark: '#E0A071' },
  travel: { light: '#2E8B8B', dark: '#5FB9B9' },
  hobbies: { light: '#7A7530', dark: '#B3AC5C' },
  other: { light: '#6B7280', dark: '#9AA1AE' },
};

export const durations = { fast: 140, base: 220, slow: 380 } as const;

/**
 * Chat-surface metrics. These live here rather than inside the chat components so the
 * bubble, the composer and the history rows cannot drift apart — the thing that makes
 * a chat feel homemade is three different paddings that were each "about right".
 */
export const chat = {
  /** A full-width line of prose is hard to read; assistant text stops short of it. */
  maxBubbleWidth: '84%',
  bubbleRadius: radius.lg,
  /** The corner nearest the speaker is tightened, which is what reads as a tail. */
  bubbleTailRadius: radius.xs,
  bubblePaddingX: spacing.base,
  bubblePaddingY: spacing.md,
  /** Between turns. Tighter within a turn, so a turn reads as one thing. */
  turnGap: spacing.xl,
  groupGap: spacing.sm,
  composerMinHeight: 40,
  /** Roughly six lines; past that the composer scrolls instead of eating the screen. */
  composerMaxHeight: 132,
  actionHitSlop: 8,
  /** Body text in a bubble runs slightly looser than elsewhere — it is read in bulk. */
  lineHeight: 23,
} as const;
