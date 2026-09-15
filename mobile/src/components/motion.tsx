import * as React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { motion, spring } from '@/theme';

/** Reusable touch response; animation never delays the action itself. */
export function useTouchMotion(pressedScale = 0.985) {
  const reduced = useReducedMotion();
  const [scale] = React.useState(() => new Animated.Value(1));
  React.useEffect(() => {
    if (reduced) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [reduced, scale]);
  const animate = React.useCallback((toValue: number) => {
    if (reduced) return;
    Animated.spring(scale, { toValue, ...spring, useNativeDriver: true }).start();
  }, [reduced, scale]);
  return { scale, pressIn: () => animate(pressedScale), pressOut: () => animate(1) };
}

/** Respecte le réglage iOS « Réduire les animations ». */
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => setReduced(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);

  return reduced;
}

/**
 * Entrée courte et native-driver. Elle donne un rythme commun aux écrans sans
 * ralentir la navigation ni animer la mise en page.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 10,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = React.useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return undefined;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          // Content must remain readable even if a native animation is interrupted.
          // Only decoration moves; first meaningful paint never waits for a fade.
          opacity: 1,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Entrée d'un bloc de contenu : léger fondu et montée de quelques points.
 *
 * Réservée aux contenus qui viennent d'arriver (données chargées, résultat
 * prêt) : un écran ne « pop » pas, il se pose. Avec « Réduire les
 * animations », le bloc est simplement là.
 */
export function Enter({
  children,
  delay = 0,
  distance = 10,
  duration = motion.base,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [progress] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return undefined;
    }
    const animation = Animated.timing(progress, { toValue: 1, delay, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress, reduced]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Séquence d'entrées : chaque enfant arrive un temps après le précédent. */
export function Stagger({
  children,
  step = 45,
  initial = 0,
  distance = 10,
}: {
  children: React.ReactNode;
  step?: number;
  initial?: number;
  distance?: number;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <>
      {items.map((child, index) => (
        <Enter key={(React.isValidElement(child) && child.key) || index} delay={initial + index * step} distance={distance}>
          {child}
        </Enter>
      ))}
    </>
  );
}

/**
 * Valeur qui compte jusqu'à sa cible.
 *
 * Un montant qui arrive à zéro puis se remplit dit « je viens d'être
 * calculé » ; un montant qui saute dit « j'étais déjà là ». Le compteur ne
 * rejoue pas quand la valeur ne change pas, et va droit au but si les
 * animations sont réduites.
 */
export function useCountUp(target: number, { duration = 760, enabled = true }: { duration?: number; enabled?: boolean } = {}): number {
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(target);
  const previous = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (reduced || !enabled || previous.current === target) {
      previous.current = target;
      setValue(target);
      return undefined;
    }
    const from = previous.current ?? 0;
    previous.current = target;
    const animated = new Animated.Value(0);
    const subscription = animated.addListener(({ value: t }) => setValue(Math.round(from + (target - from) * t)));
    const animation = Animated.timing(animated, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start(({ finished }) => { if (finished) setValue(target); });
    return () => { animation.stop(); animated.removeListener(subscription); };
  }, [target, duration, enabled, reduced]);
  return value;
}

/** Coche de réussite qui se pose d'un ressort : le signe visuel d'une action aboutie. */
export function SuccessCheck({ size = 20, color = '#0F7A52', delay = 0 }: { size?: number; color?: string; delay?: number }) {
  const reduced = useReducedMotion();
  const [scale] = React.useState(() => new Animated.Value(reduced ? 1 : 0.4));
  const [opacity] = React.useState(() => new Animated.Value(reduced ? 1 : 0));
  React.useEffect(() => {
    if (reduced) { scale.setValue(1); opacity.setValue(1); return undefined; }
    const animation = Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, damping: 11, stiffness: 320, mass: 0.6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, delay, duration: 160, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, reduced, scale]);
  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Ionicons name="checkmark-circle" size={size} color={color} />
    </Animated.View>
  );
}

/** Respiration lente d'un élément qui travaille (préparation IA). */
export function Breathe({ children, min = 1, max = 1.06, duration = 1400 }: { children: React.ReactNode; min?: number; max?: number; duration?: number }) {
  const reduced = useReducedMotion();
  const [scale] = React.useState(() => new Animated.Value(min));
  React.useEffect(() => {
    if (reduced) { scale.setValue(1); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: max, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(scale, { toValue: min, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [duration, max, min, reduced, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/**
 * Entrée d'écran partagée.
 *
 * Le « + » a fixé la règle : appui → réponse immédiate → l'écran arrive →
 * l'en-tête puis le contenu se posent. `ScreenReveal` applique cette règle
 * aux destinations importantes sans la rendre théâtrale : chaque bloc de
 * premier niveau entre à son tour, 60 ms d'écart, 260 ms par bloc, une seule
 * fois au montage. Un rendu ultérieur (liste rafraîchie, compteur mis à jour)
 * ne rejoue rien : les clés restent stables et `Enter` n'anime qu'au montage.
 * Avec « Réduire les animations », tout est simplement là.
 */
export function ScreenReveal({ children, step = 60, initial = 0, distance = 8, max = 8 }: { children: React.ReactNode; step?: number; initial?: number; distance?: number; max?: number }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <>
      {items.map((child, index) => (
        <Enter key={(React.isValidElement(child) && child.key) || index} delay={initial + Math.min(index, max) * step} distance={distance}>
          {child}
        </Enter>
      ))}
    </>
  );
}
