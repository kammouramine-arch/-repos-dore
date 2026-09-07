import * as React from 'react';
import { Animated, Easing, View } from 'react-native';
import { Logo } from '@/components/logo';
import { colors, motion, spacing, typography } from '@/theme';
import { recordDiagnostic } from '@/lib/diagnostics';
import { useMobileLocale } from '@/lib/i18n';
import { PremiumGradient } from '@/components/premium-gradient';

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
  const locale = useMobileLocale();
  const startedAt = React.useRef<number | null>(null);
  const opacity = React.useMemo(() => new Animated.Value(0), []);
  const haloOpacity = React.useMemo(() => new Animated.Value(0), []);
  const haloScale = React.useMemo(() => new Animated.Value(0.72), []);
  const rise = React.useMemo(() => new Animated.Value(14), []);
  const scale = React.useMemo(() => new Animated.Value(0.94), []);

  React.useEffect(() => {
    startedAt.current = Date.now();
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
      Animated.timing(haloOpacity, {
        toValue: 1,
        duration: motion.slow,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(haloScale, {
        toValue: 1,
        damping: 17,
        stiffness: 190,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) {
        recordDiagnostic({ area: 'startup', durationMs: Date.now() - (startedAt.current ?? Date.now()), code: 'LAUNCH_SETTLED' });
        onSettled?.();
      }
    });
    return () => animation.stop();
  }, [haloOpacity, haloScale, opacity, rise, scale, onSettled]);

  return (
    <PremiumGradient dark>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 270,
            height: 270,
            borderRadius: 135,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.38)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          }}
        />
        <Animated.View style={{ opacity, transform: [{ translateY: rise }, { scale }] }}>
          <Logo size={70} tone="white" />
        </Animated.View>
        <Animated.Text
          style={[
            typography.small,
            {
              color: 'rgba(255,255,255,0.86)',
              opacity,
              transform: [{ translateY: rise }],
              letterSpacing: 0.1,
            },
          ]}
        >
          {locale === 'en' ? 'AI-powered quotes for your business' : 'L’IA qui transforme votre travail en devis'}
        </Animated.Text>
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 54,
            width: 42,
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.white,
            opacity,
            transform: [{ scaleX: scale }],
          }}
        />
      </View>
    </PremiumGradient>
  );
}
