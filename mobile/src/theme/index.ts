/**
 * Design system DEVISIA — déclinaison mobile.
 *
 * Les valeurs reprennent exactement celles du web (`src/app/globals.css`) afin
 * que l'identité soit identique sur les trois plateformes.
 */
import { Platform } from 'react-native';

export const colors = {
  ink: '#0B1220',
  inkSoft: '#243044',
  muted: '#667085',
  subtle: '#98A2B3',
  line: '#E8ECF2',
  lineStrong: '#D8DEE8',
  surface: '#F5F7FB',
  surface2: '#EEF2F7',
  canvas: '#FFFFFF',

  accent: '#2F52E8',
  accentHover: '#2341C6',
  accentDeep: '#14245A',
  accentBright: '#6F8CFF',
  accentSoft: '#EEF2FF',
  accentBorder: '#C8D2FF',
  accentGlow: 'rgba(111, 140, 255, 0.22)',

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
  '5xl': 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 39, fontWeight: '700' as const, letterSpacing: -1.15 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '700' as const, letterSpacing: -0.75 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 19, fontWeight: '400' as const },
  caption: { fontSize: 11.5, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.55 },
  metric: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -1.1 },
} as const;

/** Ombres discrètes, jamais décoratives. */
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#0A0E14',
      shadowOpacity: 0.065,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 7 },
    },
    android: { elevation: 1 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#0A0E14',
      shadowOpacity: 0.18,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;


/**
 * Durées d'animation.
 *
 * Une interface paraît chère quand le mouvement est court et régulier. Au-delà
 * d'environ 300 ms, l'utilisateur attend l'animation au lieu de la percevoir.
 */
export const motion = {
  instant: 110,
  quick: 170,
  base: 260,
  slow: 380,
} as const;

/** Ressort commun aux interactions : ferme, sans rebond décoratif. */
export const spring = {
  damping: 20,
  stiffness: 330,
  mass: 0.62,
} as const;

/** Hauteur minimale d'une cible tactile, recommandation Apple. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const TOUCH_MIN = 44;

export const theme = { colors, spacing, radius, typography, shadows, motion, spring };
export type Theme = typeof theme;
