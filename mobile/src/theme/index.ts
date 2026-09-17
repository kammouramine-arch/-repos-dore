/**
 * Design system DEVISERA — déclinaison mobile.
 *
 * Les valeurs reprennent celles du web (`src/app/globals.css`) afin que
 * l'identité soit identique sur les trois plateformes.
 *
 * ## Pourquoi `colors` est un objet muté, et non un contexte
 *
 * Soixante-trois fichiers importent `colors` directement. Les convertir en
 * `useColors()` aurait voulu dire toucher chaque écran de l'application pour
 * livrer un mode sombre — beaucoup de risque pour aucun gain de lisibilité.
 *
 * L'objet est donc unique et ses champs sont réécrits quand le thème change
 * (`applyScheme`). Ce qui lit `colors.ink` au rendu lit la bonne valeur, sans
 * rien changer nulle part. React ne s'en apercevant pas tout seul, le
 * fournisseur de thème remonte l'arbre entier à chaque bascule : c'est franc,
 * instantané à l'échelle d'un changement de réglage, et cela garantit qu'il ne
 * reste aucun écran à l'ancienne palette.
 *
 * Deux conséquences à respecter : ne jamais capturer une couleur au niveau
 * module (`const BG = colors.surface`), et ne jamais la figer dans un
 * `StyleSheet.create` — les deux gèleraient la valeur du premier rendu.
 */
import { Platform } from 'react-native';
import { LIGHT, PALETTES, type ColorScheme, type Palette } from './palette';
import { applyGradientScheme } from './gradient';

/**
 * La palette courante.
 *
 * Mutable par construction : c'est ce qui permet au mode sombre d'atteindre
 * toute l'application sans réécrire chaque écran.
 */
export const colors: Palette = { ...LIGHT };

let current: ColorScheme = 'light';

/** Le thème réellement appliqué en ce moment. */
export function activeScheme(): ColorScheme {
  return current;
}

/**
 * Bascule la palette.
 *
 * Renvoie `true` si quelque chose a changé, pour que l'appelant sache s'il
 * doit remonter l'arbre. Les ombres suivent : une ombre calculée pour du blanc
 * ne se voit pas sur du bleu nuit, il faut plus de noir et plus d'opacité.
 */
export function applyScheme(scheme: ColorScheme): boolean {
  if (scheme === current) return false;
  current = scheme;
  Object.assign(colors, PALETTES[scheme]);
  Object.assign(shadows, shadowsFor(scheme));
  applyGradientScheme(scheme);
  return true;
}

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

/**
 * Ombres discrètes, jamais décoratives.
 *
 * En mode sombre une ombre grise disparaît : le fond est déjà sombre. Elles
 * deviennent plus noires et plus opaques, ce qui recrée la séparation que
 * l'élévation assure en clair.
 */
type ShadowSet = {
  card: object;
  glow: object;
  floating: object;
};

function shadowsFor(scheme: ColorScheme): ShadowSet {
  const dark = scheme === 'dark';
  return {
    /*
     * Ombre de carte : courte et proche de la surface. Une ombre large et
     * lointaine fait flotter les cartes comme des vignettes ; une ombre serrée
     * les pose sur la page.
     */
    card: Platform.select({
      ios: {
        shadowColor: dark ? '#000000' : '#0A1A4A',
        shadowOpacity: dark ? 0.5 : 0.06,
        shadowRadius: dark ? 14 : 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1 },
      default: {},
    }) as object,
    /** Ombre de marque, pour un élément bleu qui doit rayonner (micro, bouton +). */
    glow: Platform.select({
      ios: {
        shadowColor: dark ? '#5C7CFF' : '#2F52E8',
        shadowOpacity: dark ? 0.5 : 0.42,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
      default: {},
    }) as object,
    floating: Platform.select({
      ios: {
        shadowColor: dark ? '#000000' : '#0A0E14',
        shadowOpacity: dark ? 0.62 : 0.18,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 8 },
      default: {},
    }) as object,
  };
}

export const shadows: ShadowSet = shadowsFor('light');


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
