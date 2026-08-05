/**
 * Nova's palette. Dark first: the app is used behind a windscreen, at night,
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

  novaBlue: '#3D7BFF',
  novaViolet: '#8A6BFF',
  novaCyan: '#3ED9D2',

  green: '#32D74B',
  amber: '#FFD426',
  red: '#FF4D45',
} as const;

export const colors = {
  /** Page background — true near-black, kind to OLED panels at night. */
  background: palette.ink950,
  /** Panels sitting on the background: sheets, cards, fields. */
  surface: palette.ink800,
  /** A panel on top of another panel. */
  surfaceElevated: palette.ink700,
  /** Pressed states and subtle fills. */
  surfaceHighlight: palette.ink600,

  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  textPrimary: '#F5F7FA',
  textSecondary: 'rgba(245, 247, 250, 0.64)',
  textTertiary: 'rgba(245, 247, 250, 0.38)',
  textInverted: palette.ink950,

  accent: palette.novaBlue,
  accentMuted: 'rgba(61, 123, 255, 0.16)',
  onAccent: palette.white,

  success: palette.green,
  warning: palette.amber,
  danger: palette.red,
  dangerMuted: 'rgba(255, 77, 69, 0.14)',

  /** Dim layer behind modals and over the map. */
  scrim: 'rgba(5, 6, 9, 0.62)',
  /** Live driving state: the route already driven, and the puck. */
  routeActive: palette.novaBlue,
  routeInactive: 'rgba(245, 247, 250, 0.30)',
  routeCasing: '#0B1D3F',
} as const;

export const gradients = {
  /** The Nova signature. Used once per screen, never as a background wash. */
  brand: [palette.novaBlue, palette.novaViolet] as const,
  /** Fades map content out from under floating panels. */
  scrimDown: ['rgba(5, 6, 9, 0)', 'rgba(5, 6, 9, 0.85)'] as const,
  scrimUp: ['rgba(5, 6, 9, 0.9)', 'rgba(5, 6, 9, 0)'] as const,
  /** Splash and onboarding backdrop. */
  night: ['#0A0C11', '#111827', '#050609'] as const,
} as const;
