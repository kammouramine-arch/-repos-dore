import * as React from 'react';
import { Animated, Easing, View } from 'react-native';
import { Logo } from '@/components/logo';
import { colors, motion, spacing, typography } from '@/theme';

/**
 * Écran de lancement.
 *
 * Le précédent affichait un indicateur d'activité seul, puis basculait sans
 * transition : rien n'indiquait quelle application démarrait. Ici la marque
 * apparaît à une taille assumée, monte de quelques pixels, et l'écran
 * s'efface. Le mouvement dure moins d'une demi-seconde — au-delà, on attend
 * l'animation au lieu de la percevoir.
 */
export function LaunchScreen({ onSettled }: { onSettled?: () => void }) {
  const opacity = React.useMemo(() => new Animated.Value(0), []);
  const rise = React.useMemo(() => new Animated.Value(14), []);

  React.useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.base,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: motion.slow,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onSettled?.();
    });
    return () => animation.stop();
  }, [opacity, rise, onSettled]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <Animated.View style={{ opacity, transform: [{ translateY: rise }] }}>
        <Logo size={64} />
      </Animated.View>
      <Animated.Text
        style={[
          typography.small,
          { color: colors.subtle, opacity, transform: [{ translateY: rise }] },
        ]}
      >
        L’IA qui transforme votre travail en devis
      </Animated.Text>
    </View>
  );
}
