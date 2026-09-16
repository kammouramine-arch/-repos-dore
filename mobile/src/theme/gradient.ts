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

/**
 * Dégradé des bandeaux d'en-tête.
 *
 * Celui du dessus étale son fondu sur plus de la moitié de sa hauteur : c'est
 * ce qu'il faut pour une surface plein écran, et c'est exactement ce qu'il ne
 * faut pas pour un bandeau qui coiffe un en-tête. Le texte blanc de l'en-tête
 * y tombait dans la zone pâle et disparaissait — le nom, les pastilles d'état,
 * les titres de section.
 *
 * Ici le bleu tient jusqu'aux trois quarts, puis se dissout vite. Tout ce qui
 * est écrit en blanc tient dans le bleu franc ; le fondu ne sert plus qu'à
 * poser le bandeau sur la surface sans dessiner de frontière.
 */
export const BRAND_HEADER_GRADIENT: readonly GradientStop[] = [
  { offset: 0, color: '#2A4BE4' },
  { offset: 0.5, color: BRAND_TOP },
  { offset: 0.74, color: '#3D5CEA' },
  { offset: 0.85, color: '#7A94F2' },
  { offset: 0.93, color: '#BFCCF8' },
  { offset: 0.98, color: '#E9EEFD' },
  { offset: 1, color: BRAND_BOTTOM },
];

/**
 * Part du bandeau où le bleu reste assez franc pour porter du texte blanc.
 *
 * L'en-tête est dimensionné pour tenir dans cette part ; ce qui vient après
 * commence une fois le fondu terminé, en encre sur la surface claire.
 */
export const BRAND_HEADER_SOLID = 0.74;

/**
 * Part de la hauteur d'écran couverte par le dégradé, par écran.
 *
 * L'accueil couvrait les deux tiers de l'écran. Comme la blancheur du dégradé
 * dépend de la position à l'écran et non du contenu, tout texte blanc passant
 * sous la moitié du bandeau devenait illisible — c'est ce qui a rendu
 * « Décrivez simplement le chantier » et « VOS DEVIS » invisibles sur
 * l'appareil. Le bandeau s'arrête maintenant juste après l'en-tête : ce qui
 * est écrit en blanc tient dans le bleu franc, et tout ce qui suit est en
 * encre sur la surface claire.
 */
export const GRADIENT_SPAN = {
  home: 0.36,
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
