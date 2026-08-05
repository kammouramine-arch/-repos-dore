import { Platform, type ViewStyle } from 'react-native';

/** 4-point rhythm. Every gap in the app is one of these. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Continuous, generous corners — the single strongest signal of the platform. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 34,
  pill: 999,
} as const;

/**
 * Elevation is carried by luminance on dark backgrounds; shadows only exist to
 * lift floating elements off the map, where there is real depth to suggest.
 */
export const shadows = {
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.45,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    default: { elevation: 12 },
  }),
  control: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    default: { elevation: 6 },
  }),
} as const;

/** Shared sizing for touch targets — never below 44 pt. */
export const sizing = {
  minTouchTarget: 44,
  controlHeight: 56,
  fieldHeight: 54,
  iconButton: 44,
} as const;

/** Motion. Fast enough to feel instant, slow enough to read as deliberate. */
export const motion = {
  fast: 160,
  base: 260,
  slow: 420,
  splash: 900,
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
} as const;
