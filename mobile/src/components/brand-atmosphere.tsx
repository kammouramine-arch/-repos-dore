import * as React from 'react';
import { View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';
import { BRAND_TOP } from '@/theme/gradient';

/**
 * L'atmosphère de marque, posée **dans** le contenu.
 *
 * ## Le défaut d'origine : deux plans qui se coupent
 *
 * La toute première version dessinait le bleu dans une vue en position
 * absolue calée sur l'écran, pendant que le contenu défilait par-dessus. Deux
 * calques indépendants, donc une frontière mobile, donc une bande bleue
 * horizontale qui finissait toujours par traverser une carte. Accélérer ou
 * comprimer ce calque déplaçait le défaut sans jamais l'enlever.
 *
 * Elle est donc devenue un **élément du flux**, premier enfant de la zone
 * défilante : elle monte exactement à la vitesse du contenu parce qu'elle
 * *est* le contenu. Plus deux plans, plus de couture. Cela reste vrai.
 *
 * ## Le défaut qu'on corrige ici : le fondu réservait sa place
 *
 * Pour être certain qu'aucun intitulé gris ne tombe sur du bleu, la version
 * précédente réservait le fondu : une vue **vide** de 176 points posée sous le
 * héros, que rien ne pouvait occuper. Mesuré sur l'appareil, entre la dernière
 * ligne de l'en-tête et le premier intitulé de section il y avait 204 points —
 * 176 de réserve, 20 d'écart de section, 8 de marge basse. Autrement dit : la
 * totalité du vide dont on se plaignait était cette réserve. La ramener de 240
 * à 176 n'avait retiré que 27 points à l'écran ; c'est pourquoi rien n'avait
 * visiblement changé.
 *
 * La réserve disparaît. Le dégradé descend maintenant **sous** la boîte, en
 * débordement : il est peint par un enfant absolu qui dépasse le bas de son
 * parent, donc il n'occupe aucune hauteur de mise en page, et les frères qui
 * suivent — qui se peignent après lui — passent par-dessus. Le contenu reprend
 * immédiatement là où le héros s'arrête, et le bleu continue de se dissoudre
 * derrière lui.
 *
 * ## Ce que cela suppose de l'écran
 *
 * Que ce qui suit immédiatement l'atmosphère soit **opaque** — une carte, une
 * tuile — et non un intitulé gris nu. C'est la contrepartie de la réserve
 * supprimée, et c'est la composition qui la respecte : les intitulés de
 * section qui tombent sur le bleu sont passés *dans* le héros, écrits en
 * blanc, et c'est une carte qui ouvre la suite. Un écran qui ne peut pas
 * respecter cela demande `fade={0}`.
 *
 * ## Pourquoi on ne voit pas où elle se termine
 *
 * Son dernier arrêt est **exactement** `colors.surface`, la couleur de la
 * page : le dégradé ne s'arrête pas, il rejoint le fond. Le mode sombre n'est
 * pas le même dégradé sur fond noir — `colors.surface` valant le bleu de nuit
 * de l'application, la descente y va directement, sans jamais passer par une
 * zone pâle qui ferait une bande lumineuse au milieu de l'écran.
 */

/** Assez d'arrêts pour qu'aucune marche ne se voie sur un écran de 3x. */
const STOPS = 24;

/**
 * Longueur du fondu, en points, sous le contenu du héros.
 *
 * Une **distance**, pas une proportion : la toute première version fixait la
 * part saturée à 42 % de la hauteur totale, ce qui donnait cinq cent cinquante
 * points de fondu sur Mon compte, dont l'en-tête est plus haut.
 *
 * Et surtout : cette distance ne coûte plus rien à la mise en page. Elle peut
 * donc être généreuse — c'est du débordement, pas de la réserve — et rester
 * douce aux deux bouts.
 */
const FADE = 168;

/**
 * Le profil de la descente.
 *
 * `t` va de 0 (haut, bleu de marque) à 1 (bas, couleur de page). La courbe
 * tient le bleu franc au départ puis accélère doucement : une interpolation
 * linéaire laisse une frontière perceptible au milieu, celle-ci n'en a pas.
 */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

function mix(from: string, to: string, amount: number): string {
  const read = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = read(from);
  const [r2, g2, b2] = read(to);
  const channel = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `rgb(${channel(r1, r2)}, ${channel(g1, g2)}, ${channel(b1, b2)})`;
}

/**
 * Les arrêts, calculés à chaque rendu depuis la palette courante.
 *
 * Ils ne sont pas écrits en dur : le bas doit valoir la couleur de page du
 * thème actif, sinon le bleu s'arrêterait une nuance au-dessus du fond et
 * dessinerait précisément la ligne qu'on cherche à supprimer.
 *
 * `hold` est la part de la hauteur où le bleu reste plein — celle que couvre
 * le contenu confié. Le fondu ne commence qu'après.
 */
function stops(hold: number): { offset: number; color: string }[] {
  const surface = colors.surface;
  return Array.from({ length: STOPS }, (_, index) => {
    const t = index / (STOPS - 1);
    const fade = hold >= 1 ? 0 : Math.max(0, (t - hold) / (1 - hold));
    return { offset: t, color: mix(BRAND_TOP, surface, ease(fade)) };
  });
}

/**
 * Débordements.
 *
 * `TOP_BLEED` fait remonter le dégradé au-delà du haut de l'écran : la couleur
 * tient pendant le rebond d'un tiré vers le bas, au lieu de découvrir le fond.
 * `SIDE_BLEED` compense la marge horizontale de l'écran pour que la couleur
 * touche les deux bords.
 */
const TOP_BLEED = 260;
const SIDE_BLEED = 32;

export interface BrandAtmosphereProps {
  /** Ce qui s'écrit sur le bleu saturé : identité, état, intitulé, cartes. */
  children?: React.ReactNode;
  /**
   * Position de défilement.
   *
   * Facultative. Sans elle, l'atmosphère est simplement portée par le
   * défilement, ce qui suffit déjà à supprimer toute couture. Avec elle, le
   * bleu se retire à mesure qu'on descend : le héros « répond » au geste sans
   * qu'aucune frontière n'apparaisse jamais.
   */
  scrollY?: SharedValue<number>;
  /** Hauteur minimale du bleu plein tant que le contenu n'est pas mesuré. */
  minHeight?: number;
  /**
   * Longueur du fondu sous le contenu, en débordement. Par défaut `FADE`.
   * `0` arrête le bleu net au bas du héros, pour un écran dont la suite ne
   * serait pas opaque.
   */
  fade?: number;
}

export function BrandAtmosphere({ children, scrollY, minHeight = 120, fade = FADE }: BrandAtmosphereProps) {
  const { width } = useWindowDimensions();
  const [contentHeight, setContentHeight] = React.useState<number | null>(null);

  /*
   * Le bleu plein couvre exactement le contenu confié ; le fondu vient après,
   * hors mise en page. La boîte, elle, ne fait que la hauteur du contenu :
   * c'est ce qui fait que la section suivante commence tout de suite.
   */
  const solid = Math.max(minHeight, contentHeight ?? minHeight);
  const height = solid + fade;
  const palette = stops(fade <= 0 ? 1 : solid / height);

  /*
   * Les arrêts replacés dans la hauteur totale, débordement du haut compris.
   *
   * Ce débordement reprend le bleu plein : il n'est visible que pendant le
   * rebond d'un tiré vers le bas, et doit y être d'une seule couleur plutôt
   * que de laisser voir le début du fondu.
   */
  const painted = [
    { offset: 0, color: BRAND_TOP },
    ...palette.map((stop) => ({
      offset: (TOP_BLEED + stop.offset * height) / (height + TOP_BLEED),
      color: stop.color,
    })),
  ];

  const measure = React.useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setContentHeight((previous) => (previous != null && Math.abs(previous - next) < 2 ? previous : next));
  }, []);

  /*
   * La réponse au défilement se joue **à l'intérieur** de la boîte : on ne
   * déplace pas la boîte, on change la façon dont le dégradé remplit sa propre
   * surface. La géométrie de la page n'est jamais touchée, donc rien ne peut
   * se décaler par rapport au contenu. Tout est calculé sur le fil d'interface.
   */
  const paint = useAnimatedStyle(() => {
    if (!scrollY) return {};
    const y = Math.max(0, scrollY.value);
    return {
      opacity: interpolate(y, [0, height * 1.5], [1, 0.4], 'clamp'),
      transform: [{ translateY: interpolate(y, [0, height], [0, -height * 0.16], 'clamp') }],
    };
  });

  return (
    <View pointerEvents="box-none" style={{ marginHorizontal: -SIDE_BLEED, paddingHorizontal: SIDE_BLEED }}>
      {/*
        Le dégradé déborde du bas de son parent : il ne prend donc aucune
        hauteur de mise en page, et les frères suivants, peints après lui,
        passent par-dessus son fondu. C'est ce débordement qui remplace la
        réserve vide de la version précédente.
      */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: -TOP_BLEED, left: 0, right: 0, height: height + TOP_BLEED },
          paint,
        ]}
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="devisera-atmosphere" x1="0" y1="0" x2="0" y2="1">
              {painted.map((stop) => (
                <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity="1" />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width + SIDE_BLEED * 2} height="100%" fill="url(#devisera-atmosphere)" />
        </Svg>
      </Animated.View>

      <View onLayout={measure}>{children}</View>
    </View>
  );
}
