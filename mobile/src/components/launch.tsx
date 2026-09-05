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
  const scale = React.useMemo(() => new Animated.Value(0.94), []);

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
      Animated.spring(scale, {
        toValue: 1,
        damping: 18,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onSettled?.();
    });
    return () => animation.stop();
  }, [opacity, rise, scale, onSettled]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: colors.accentGlow,
          opacity: 0.55,
        }}
      />
      <Animated.View style={{ opacity, transform: [{ translateY: rise }, { scale }] }}>
        <Logo size={70} />
      </Animated.View>
      <Animated.Text
        style={[
          typography.small,
          {
            color: colors.muted,
            opacity,
            transform: [{ translateY: rise }],
            letterSpacing: 0.1,
          },
        ]}
      >
        L’IA qui transforme votre travail en devis
      </Animated.Text>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 54,
          width: 42,
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.accent,
          opacity,
          transform: [{ scaleX: scale }],
        }}
      />
    </View>
  );
}
