import { DynamicColorIOS, Platform } from 'react-native';
const adaptive = (light: string, dark: string) => Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : light;
/**
 * Avyro's palette. Dark first: the app is used behind a windscreen, at night,
 * for hours — so the base is near-black, surfaces are separated by luminance
 * rather than by borders, and exactly one colour is allowed to glow.
 */

export const palette = {
  ink950: '#050609',
  ink900: '#0A0C11',
  ink800: '#101319',
  ink700: '#171B23',
  ink600: '#1F242E',
  ink500: '#2A303C',

  white: '#FFFFFF',

  avyroBlue: '#3D7BFF',
  avyroViolet: '#8A6BFF',
  avyroCyan: '#3ED9D2',

  green: '#32D74B',
  amber: '#FFD426',
  red: '#FF4D45',
} as const;

export const colors = {
  /** Page background — true near-black, kind to OLED panels at night. */
  background: adaptive('#F4F6F8', '#0D202B'),
  /** Panels sitting on the background: sheets, cards, fields. */
  surface: adaptive('#FFFFFF', '#16303B'),
  /** A panel on top of another panel. */
  surfaceElevated: adaptive('#F1F4F5', '#203D49'),
  /** Pressed states and subtle fills. */
  surfaceHighlight: adaptive('#EAF0F2', '#294957'),

  border: 'rgba(17, 35, 46, 0.08)',
  borderStrong: 'rgba(17, 35, 46, 0.12)',

  textPrimary: adaptive('#132C38', '#EFF9F7'),
  textSecondary: adaptive('#566F7B', '#BCCED3'),
  textTertiary: adaptive('#647D87', '#A1BBC3'),
  textInverted: '#FFFFFF',

  accent: adaptive('#087F83', '#67EDC1'),
  accentMuted: adaptive('#E0F3F1', '#244C50'),
  onAccent: palette.white,

  success: '#16805A',
  warning: '#AB6A00',
  danger: '#C1373B',
  dangerMuted: adaptive('#FCE8E9', '#522B38'),

  /** Dim layer behind modals and over the map. */
  scrim: 'rgba(5, 6, 9, 0.62)',
  /** Live driving state: the route already driven, and the puck. */
  routeActive: '#087F83',
  routeInactive: '#A6B7C0',
  routeCasing: '#FFFFFF',
} as const;

export const gradients = {
  /** The Avyro signature. Used once per screen, never as a background wash. */
  brand: ['#087F83', '#245477'] as const,
  /** Fades map content out from under floating panels. */
  scrimDown: ['rgba(5, 6, 9, 0)', 'rgba(5, 6, 9, 0.85)'] as const,
  scrimUp: ['rgba(5, 6, 9, 0.9)', 'rgba(5, 6, 9, 0)'] as const,
  /** Splash and onboarding backdrop. */
  night: ['#F6FAFA', '#E5F2F1', '#F4F6F8'] as const,
} as const;
