/**
 * Dégradé de marque DEVISERA.
 *
 * L'ancien dégradé comptait quatre arrêts et s'arrêtait sur une bande : on
 * lisait « une section bleue, puis une section blanche ». Celui-ci tient le
 * bleu saturé sur le premier tiers, puis se dissout par paliers rapprochés —
 * bleu adouci, bleu clair, bleu pâle, presque blanc — jusqu'au blanc. Aucun
 * arrêt ne saute assez pour dessiner une frontière ; la zone de fondu occupe
 * plus de la moitié de la hauteur, ce qui donne l'atmosphère attendue.
 *
 * Les arrêts sont des données pures pour être vérifiés par des tests et rendus
 * à l'identique en natif (SVG) et pour les captures de comparaison.
 */
export interface GradientStop {
  offset: number;
  color: string;
}

/** Bleu d'accroche : celui de l'écran de lancement natif et du haut des écrans. */
export const BRAND_TOP = '#2F52E8';
/** Fond des écrans, atteint en bas du fondu. */
export const BRAND_BOTTOM = '#FFFFFF';

export const BRAND_GRADIENT: readonly GradientStop[] = [
  { offset: 0, color: '#2A4BE4' },
  { offset: 0.3, color: BRAND_TOP },
  { offset: 0.44, color: '#4A69EC' },
  { offset: 0.56, color: '#7590F1' },
  { offset: 0.66, color: '#A0B3F5' },
  { offset: 0.75, color: '#C4D0F9' },
  { offset: 0.83, color: '#DEE5FC' },
  { offset: 0.9, color: '#EEF2FE' },
  { offset: 0.96, color: '#F8FAFF' },
  { offset: 1, color: BRAND_BOTTOM },
];

/** Part de la hauteur d'écran couverte par le dégradé, par écran. */
export const GRADIENT_SPAN = {
  home: 0.64,
  auth: 0.68,
  /** Réglages : l'identité respire sur le bleu, les groupes reposent sur le fondu. */
  settings: 0.5,
} as const;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** Luminance relative (sRGB), 0 = noir, 1 = blanc. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
