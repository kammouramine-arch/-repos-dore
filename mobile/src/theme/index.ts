/**
 * Design system DEVISIA — déclinaison mobile.
 *
 * Les valeurs reprennent exactement celles du web (`src/app/globals.css`) afin
 * que l'identité soit identique sur les trois plateformes.
 */
import { Platform } from 'react-native';

export const colors = {
  ink: '#0A0E14',
  inkSoft: '#1C2532',
  muted: '#5B6675',
  subtle: '#8A93A1',
  line: '#E6E9EE',
  lineStrong: '#D4D9E1',
  surface: '#F7F8FA',
  surface2: '#F1F3F6',
  canvas: '#FFFFFF',

  accent: '#2547E0',
  accentHover: '#1C39BD',
  accentSoft: '#EEF1FE',
  accentBorder: '#C9D3FB',

  success: '#0F7A52',
  successSoft: '#E7F6EF',
  warning: '#A35B06',
  warningSoft: '#FDF3E6',
  danger: '#B42318',
  dangerSoft: '#FDECEB',
  info: '#1E5FA8',
  infoSoft: '#EAF2FB',

  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.8 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 11.5, lineHeight: 15, fontWeight: '600' as const, letterSpacing: 0.6 },
  metric: { fontSize: 28, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.9 },
} as const;

/** Ombres discrètes, jamais décoratives. */
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#0A0E14',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 1 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#0A0E14',
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const theme = { colors, spacing, radius, typography, shadows };
export type Theme = typeof theme;
