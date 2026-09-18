import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { activeScheme } from '@/theme';
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
  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(activeScheme() === 'dark' ? 'light' : 'dark');
    }, []),
  );
  /*
   * `paddingTop` a disparu : c'est `Screen` qui pose la zone sûre, une seule
   * fois. La cumuler ici la comptait deux fois — iOS l'ajoutait déjà par
   * `contentInsetAdjustmentBehavior`, ce qui donnait 134 points de bleu vide
   * en tête d'écran sur un iPhone à encoche.
   */
  return { gradientHeight: Math.round(height * GRADIENT_SPAN[span]) };
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
