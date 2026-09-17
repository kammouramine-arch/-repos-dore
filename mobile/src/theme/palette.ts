/**
 * Les deux palettes de DEVISERA.
 *
 * ## Pourquoi le sombre n'est pas le clair inversé
 *
 * Inverser une palette claire donne toujours le même résultat : des blancs
 * devenus noir pur, des gris devenus gris sales, et un bleu de marque qui
 * disparaît. Trois principes ont guidé celle-ci.
 *
 * **Le fond n'est pas noir.** `#0B0F17` est un bleu très sombre, désaturé.
 * Le noir pur fait vibrer le texte blanc sur les écrans OLED et rend les
 * ombres invisibles ; un fond légèrement bleuté garde l'identité et laisse
 * respirer les surfaces posées dessus.
 *
 * **Les surfaces montent, elles ne descendent pas.** En clair, une carte est
 * plus blanche que la page. En sombre, l'élévation se lit à l'inverse : la
 * carte est plus *claire* que le fond, jamais plus sombre. D'où `canvas`
 * (`#131924`) au-dessus de `surface` (`#0B0F17`).
 *
 * **Le bleu s'éclaircit.** `#2F52E8` sur un fond sombre tombe sous le seuil
 * de lisibilité : il fonce au lieu de ressortir. L'accent passe à `#5C7CFF`,
 * la même couleur perçue, portée par un fond qui absorbe la lumière. Le bleu
 * saturé de la marque reste celui du bandeau, où il porte du texte blanc.
 *
 * Les états gardent leur sens — vert pour ce qui est réglé, ambre pour ce qui
 * attend, rouge pour ce qui bloque — mais sont désaturés et éclaircis pour
 * tenir sur fond sombre sans crier.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  ink: string;
  inkSoft: string;
  muted: string;
  subtle: string;
  line: string;
  lineStrong: string;
  surface: string;
  surface2: string;
  canvas: string;

  accent: string;
  accentHover: string;
  accentDeep: string;
  accentBright: string;
  accentSoft: string;
  accentBorder: string;
  accentGlow: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  /** Toujours blanc : c'est l'encre du bandeau de marque, dans les deux modes. */
  white: string;
}

export const LIGHT: Palette = {
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
};

export const DARK: Palette = {
  ink: '#EDF1F8',
  inkSoft: '#C6CFDE',
  muted: '#8E9AAF',
  subtle: '#6D7A8F',
  line: '#212936',
  lineStrong: '#303A4B',
  surface: '#0B0F17',
  surface2: '#161C27',
  canvas: '#131924',

  accent: '#5C7CFF',
  accentHover: '#7B95FF',
  accentDeep: '#0D1633',
  accentBright: '#93A9FF',
  accentSoft: '#1A2340',
  accentBorder: '#2E3B66',
  accentGlow: 'rgba(120, 148, 255, 0.26)',

  success: '#4ADE9B',
  successSoft: '#10251D',
  warning: '#E3A54A',
  warningSoft: '#2A2010',
  danger: '#FF7A6B',
  dangerSoft: '#2C1614',
  info: '#6BADEF',
  infoSoft: '#111F2E',

  white: '#FFFFFF',
};

export const PALETTES: Record<ColorScheme, Palette> = { light: LIGHT, dark: DARK };
