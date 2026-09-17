import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { activeScheme, spacing } from '@/theme';
import { GRADIENT_SPAN } from '@/theme/gradient';

/**
 * Ce qui reste du décor de marque : la position de défilement, et les marges.
 *
 * Le dégradé vivait ici, dans une vue en position absolue calée sur l'écran,
 * pendant que le contenu défilait par-dessus. C'était la cause de la bande
 * bleue derrière les cartes de réglages et des intitulés gris sur bleu : deux
 * plans qui glissent l'un sur l'autre finissent toujours par se couper.
 *
 * Il est parti dans `brand-atmosphere.tsx`, où il est un élément du flux.
 * Il ne reste ici que ce qui n'a jamais été en cause.
 */

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
