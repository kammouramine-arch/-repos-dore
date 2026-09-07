import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { spacing } from '@/theme';
import { GRADIENT_SPAN } from '@/theme/gradient';
import { PremiumGradient } from './premium-gradient';

/**
 * Surface de marque derrière un écran : le dégradé bleu → blanc calé sous la
 * barre d'état, et une barre d'état claire tant que l'écran est visible.
 * Partagé par l'accueil et « Mon espace » pour que les deux respirent pareil.
 */
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

export function BrandBackdrop({ height }: { height: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <PremiumGradient />
    </View>
  );
}
