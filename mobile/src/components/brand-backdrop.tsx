import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { activeScheme, spacing } from '@/theme';
import { GRADIENT_SPAN } from '@/theme/gradient';
import { PremiumGradient } from './premium-gradient';

/**
 * La surface de marque, pilotée par le défilement.
 *
 * ## Ce qui n'allait pas
 *
 * Le dégradé était posé en position absolue **par rapport à l'écran**, donc
 * cloué au cadre. Le contenu, lui, défilait par-dessus. Deux conséquences,
 * toutes deux visibles sur l'appareil :
 *
 * - les intitulés de section, gris, traversaient un champ bleu immobile et
 *   devenaient illisibles — « CONFIDENTIALITÉ ET DONNÉES » sur fond bleu ;
 * - la frontière bleu/blanc ne bougeait jamais, ce qui donnait deux
 *   rectangles empilés plutôt qu'un écran.
 *
 * ## Ce qui se passe maintenant
 *
 * Le bandeau ne glisse plus : il se **comprime**, ancré sur le haut de
 * l'écran. Son dégradé se referme avec lui, donc la zone de fondu remonte
 * dans le cadre au lieu d'être la même image déplacée plus haut. Le contenu
 * clair, lui, monte à sa vitesse propre : on voit la surface bleue se retirer
 * pendant que la page se lève, et non deux rectangles qui coulissent.
 *
 * ## La règle qui protège la lisibilité
 *
 * La compression est calée pour que le bord bas du bandeau recule **au moins
 * aussi vite que le contenu** : `facteur = 1 − y / hauteur`. Un intitulé gris
 * qui est sous le bandeau au repos y reste, quelle que soit la course de
 * défilement. C'est ce qui rend impossible le défaut constaté sur l'appareil —
 * « CONFIDENTIALITÉ ET DONNÉES » écrit en gris au milieu du bleu. Une
 * parallaxe plus lente ferait joli et casserait cette garantie : le bandeau
 * s'attarderait, et le contenu finirait par le traverser.
 *
 * La profondeur vient donc d'ailleurs : l'en-tête blanc monte un peu plus vite
 * que la page et se retire légèrement en arrière-plan avant de s'effacer.
 *
 * Deux gestes, dérivés d'une seule valeur (la position de défilement), tous
 * deux calculés sur le fil d'interface :
 *
 * 1. **Compression** — vers le bas, le bandeau se referme jusqu'à disparaître.
 * 2. **Étirement** — tiré vers le bas, il s'agrandit depuis son bord haut,
 *    comme une surface élastique.
 *
 * Rien de tout cela ne doit se remarquer. Si l'on voit l'animation, elle est
 * trop forte : les valeurs sont réglées pour qu'on ressente la profondeur sans
 * pouvoir nommer ce qui bouge.
 */

/** Part maximale d'agrandissement quand on tire vers le bas. */
const STRETCH_MAX = 0.6;

export function useBrandSurface(span: keyof typeof GRADIENT_SPAN = 'home') {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(activeScheme() === 'dark' ? 'light' : 'dark');
    }, []),
  );
  return { gradientHeight: Math.round(height * GRADIENT_SPAN[span]), paddingTop: insets.top + spacing.lg };
}

/**
 * La position de défilement d'un écran, et le gestionnaire à lui brancher.
 *
 * La valeur vit sur le fil d'interface : le bandeau la lit sans passer par
 * JavaScript, donc sans image perdue même pendant une liste qui se charge.
 */
export function useBrandScroll() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, onScroll };
}

export function BrandBackdrop({
  height,
  bottom,
  header,
  scrollY,
}: {
  height: number;
  bottom?: string;
  header?: boolean;
  /** Sans elle, le bandeau reste fixe — le comportement d'avant. */
  scrollY?: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    if (!scrollY) return {};
    const y = scrollY.value;
    /*
     * Un seul facteur d'échelle verticale décrit les deux sens : au-dessus de
     * zéro il comprime, en dessous il étire. Vers le bas, `1 − y / hauteur`
     * fait reculer le bord bas exactement à la vitesse du contenu — c'est la
     * garantie de lisibilité décrite plus haut.
     */
    const factor = y < 0
      ? 1 + Math.min(-y / height, STRETCH_MAX)
      : Math.max(0, 1 - y / height);
    return {
      // L'effacement se joue sur la fin de la course, quand il ne reste
      // qu'un liseré : il ne doit pas éclaircir le bleu tant qu'il porte du
      // texte blanc.
      opacity: interpolate(y, [0, height * 0.8, height], [1, 1, 0.6], 'clamp'),
      transform: [
        { scaleY: factor },
        // `scaleY` travaille depuis le centre : ce décalage ramène l'ancrage
        // sur le bord haut, sans quoi le bandeau se décollerait du sommet de
        // l'écran en se comprimant.
        { translateY: (height * (factor - 1)) / 2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, height }, style]}
    >
      <PremiumGradient bottom={bottom} header={header} />
    </Animated.View>
  );
}

/**
 * L'en-tête écrit en blanc, qui s'efface en montant.
 *
 * Il monte légèrement plus vite que le bandeau et perd son opacité avant de
 * l'atteindre : le texte blanc a donc disparu bien avant d'arriver dans la
 * zone claire du fondu. C'est ce qui garantit qu'aucune lettre blanche ne se
 * retrouve jamais sur du presque blanc, quel que soit le défilement.
 */
export function BrandHeader({
  scrollY,
  height,
  children,
  onLayout,
}: {
  scrollY?: SharedValue<number>;
  /** Hauteur du bandeau, qui donne l'échelle du mouvement. */
  height: number;
  children: React.ReactNode;
  onLayout?: React.ComponentProps<typeof View>['onLayout'];
}) {
  const style = useAnimatedStyle(() => {
    if (!scrollY) return {};
    const y = Math.max(0, scrollY.value);
    return {
      opacity: interpolate(y, [0, height * 0.45], [1, 0], 'clamp'),
      transform: [
        { translateY: -y * 0.18 },
        // Le titre se retire légèrement en profondeur avant de s'effacer :
        // il passe d'un plan à l'autre au lieu de simplement disparaître.
        { scale: interpolate(y, [0, height * 0.45], [1, 0.94], 'clamp') },
      ],
    };
  });

  return (
    <Animated.View onLayout={onLayout} style={style}>
      {children}
    </Animated.View>
  );
}
