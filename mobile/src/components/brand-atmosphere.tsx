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
 * ## Le défaut qu'elle supprime
 *
 * La version précédente dessinait le bleu dans une vue en position absolue,
 * calée sur l'écran, pendant que le contenu défilait par-dessus. Deux calques
 * indépendants, donc deux défauts qu'aucun réglage d'animation ne pouvait
 * résoudre :
 *
 * - **la couture** : le bas du bleu tombait à un endroit qui n'avait rien à
 *   voir avec le contenu, d'où une bande bleue horizontale derrière la
 *   première carte des réglages ;
 * - **la traversée** : un intitulé de section pouvait se retrouver au milieu
 *   du bleu, gris sur bleu saturé, illisible.
 *
 * Accélérer, ralentir ou comprimer ce calque déplaçait le défaut sans jamais
 * l'enlever : tant que deux plans glissent l'un sur l'autre, il existe une
 * position de défilement où la frontière coupe une carte.
 *
 * ## Ce que fait celle-ci
 *
 * Elle est un **élément du flux**, le premier enfant de la zone défilante.
 * Elle monte donc exactement à la vitesse du contenu, parce qu'elle *est* le
 * contenu. Il n'y a plus deux plans, donc plus de frontière mobile, donc plus
 * de couture possible — à aucune position de défilement, sur aucun appareil.
 *
 * ## Elle calcule sa propre hauteur
 *
 * Le composant mesure ce qu'on lui confie et en déduit la hauteur du dégradé,
 * de sorte que le contenu blanc se termine toujours à `SOLID`, là où le bleu
 * porte encore du texte. Les anciennes versions confiaient ce calcul à chaque
 * écran ; les deux écrans le faisaient différemment, et c'est de là que
 * venaient les bandes. Un seul endroit sait, maintenant.
 *
 * ## Pourquoi on ne voit pas où elle se termine
 *
 * Son dernier arrêt est **exactement** `colors.surface`, la couleur de la
 * page. Le dégradé ne s'arrête donc pas : il rejoint le fond. Et la descente
 * est longue — près de soixante pour cent de sa hauteur n'est que du fondu —
 * en passant par des bleus de plus en plus désaturés plutôt qu'en
 * s'éclaircissant d'un coup.
 *
 * Le mode sombre n'est pas le même dégradé sur fond noir : `colors.surface`
 * valant alors le bleu de nuit de l'application, la descente y va directement,
 * sans jamais passer par une zone pâle qui ferait une bande lumineuse au
 * milieu de l'écran.
 */

/** Assez d'arrêts pour qu'aucune marche ne se voie sur un écran de 3x. */
const STOPS = 24;

/**
 * Longueur du fondu, en points, sous le contenu.
 *
 * Une **distance**, pas une proportion. La première version fixait la part
 * saturée à 42 % de la hauteur totale : avec l'en-tête de Compte, plus haut
 * que celui de l'accueil, le fondu occupait cinq cent cinquante points — un
 * vide considérable entre l'identité et la première section.
 *
 * Ici le bleu couvre exactement ce qu'on lui confie, et le fondu qui suit fait
 * toujours la même longueur, quel que soit l'écran. Deux cent quarante points
 * suffisent à ce qu'on ne puisse pas montrer où le bleu s'arrête, sans laisser
 * un demi-écran vide.
 */
const FADE = 240;

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
  /** Ce qui s'écrit dans la partie saturée : identité, salutation, titre. */
  children?: React.ReactNode;
  /**
   * Position de défilement.
   *
   * Facultative. Sans elle, l'atmosphère est simplement portée par le
   * défilement, ce qui suffit déjà à supprimer toute couture. Avec elle, le
   * bleu se désature à mesure qu'on descend : le héros « répond » au geste
   * sans qu'aucune frontière n'apparaisse jamais.
   */
  scrollY?: SharedValue<number>;
  /** Hauteur minimale du dégradé tant que le contenu n'est pas mesuré. */
  minHeight?: number;
}

export function BrandAtmosphere({ children, scrollY, minHeight = 120 }: BrandAtmosphereProps) {
  const { width } = useWindowDimensions();
  const [contentHeight, setContentHeight] = React.useState<number | null>(null);

  /*
   * Le bleu couvre exactement le contenu ; le fondu vient après, toujours de
   * la même longueur. Le fondu est laissé **vide** : c'est ce qui garantit
   * qu'aucun intitulé de section ne peut se retrouver sur du bleu, quelle que
   * soit la position de défilement.
   */
  const solid = Math.max(minHeight, contentHeight ?? minHeight);
  const height = solid + FADE;
  const palette = stops(solid / height);

  /*
   * Les arrêts replacés dans la hauteur totale, débordement compris.
   *
   * Le débordement du haut reprend le bleu plein : il n'est visible que
   * pendant le rebond d'un tiré vers le bas, et doit y être d'une seule
   * couleur plutôt que de laisser voir le début du fondu.
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
   * La réponse au défilement se joue **à l'intérieur** de la boîte en flux :
   * on ne déplace pas la boîte, on change la façon dont le dégradé remplit sa
   * propre surface. La géométrie de la page n'est jamais touchée, donc rien ne
   * peut se décaler par rapport au contenu. Tout est calculé sur le fil
   * d'interface.
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
      {/* Le fondu, laissé vide : c'est ce qui garantit qu'aucun intitulé de
          section ne peut se retrouver sur du bleu. */}
      <View pointerEvents="none" style={{ height: FADE }} />
    </View>
  );
}
