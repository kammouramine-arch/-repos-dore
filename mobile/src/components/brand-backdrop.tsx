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
import { spacing } from '@/theme';
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
 * Le bandeau suit le défilement, un peu plus lentement que le contenu. Il
 * s'en va donc pour de bon — plus aucun texte ne peut le traverser — et la
 * légère différence de vitesse donne la profondeur qu'on attend d'une
 * application native, sans qu'aucune animation ne se remarque.
 *
 * Trois gestes, tous dérivés d'une seule valeur (la position de défilement),
 * tous calculés sur le fil d'interface :
 *
 * 1. **Parallaxe** — le bandeau monte à 0,72 fois la vitesse du contenu.
 * 2. **Étirement** — tiré vers le bas, il s'agrandit depuis son bord haut,
 *    comme une surface élastique. C'est le seul endroit où il grandit.
 * 3. **Effacement** — il s'éclaircit sur la fin de sa course, pour que sa
 *    disparition soit finie avant qu'il ne quitte le cadre.
 */

/** Vitesse du bandeau par rapport au contenu. 1 = collé, 0 = immobile. */
const PARALLAX = 0.72;

export function useBrandSurface(span: keyof typeof GRADIENT_SPAN = 'home') {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
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
    // Tiré vers le bas : on étire depuis le haut plutôt que de déplacer.
    const stretch = y < 0 ? 1 + Math.min(-y / height, 0.6) : 1;
    return {
      opacity: interpolate(y, [0, height * 0.75, height], [1, 1, 0.55], 'clamp'),
      transform: [
        { translateY: y < 0 ? 0 : -y * PARALLAX },
        { scaleY: stretch },
        // `scaleY` grandit depuis le centre : on recentre sur le bord haut.
        { translateY: y < 0 ? (height * (stretch - 1)) / 2 : 0 },
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
      transform: [{ translateY: -y * 0.18 }],
    };
  });

  return (
    <Animated.View onLayout={onLayout} style={style}>
      {children}
    </Animated.View>
  );
}
