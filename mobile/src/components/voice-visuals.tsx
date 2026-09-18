import * as React from 'react';
import { Animated, Easing, View } from 'react-native';
import { colors } from '@/theme';
import { useReducedMotion } from './motion';

/**
 * Visuels de la dictée.
 *
 * Un micro qui pulse seul ressemble à un bouton en panne. Pendant l'écoute,
 * deux anneaux s'ouvrent en décalé autour du bouton et cinq barres respirent
 * dessous : l'artisan voit que l'application écoute. Aucune barre ne suit le
 * niveau sonore réel — la reconnaissance native ne l'expose pas — et rien ne
 * prétend le contraire : c'est un état, pas une mesure.
 */
export function ListeningRings({ size, active }: { size: number; active: boolean }) {
  const reduced = useReducedMotion();
  const [a] = React.useState(() => new Animated.Value(0));
  const [b] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    if (!active || reduced) { a.setValue(0); b.setValue(0); return undefined; }
    const ring = (value: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
    const loops = [ring(a, 0), ring(b, 800)];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [a, active, b, reduced]);
  if (!active || reduced) return null;
  const style = (value: Animated.Value) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: colors.accent,
    opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  });
  return (
    <>
      <Animated.View pointerEvents="none" style={style(a)} />
      <Animated.View pointerEvents="none" style={style(b)} />
    </>
  );
}

const BARS = [0.45, 0.8, 1, 0.7, 0.5];

export function Waveform({ active, color = colors.accent }: { active: boolean; color?: string }) {
  const reduced = useReducedMotion();
  const [values] = React.useState(() => BARS.map(() => new Animated.Value(0.35)));
  React.useEffect(() => {
    if (!active || reduced) { values.forEach((v) => v.setValue(0.35)); return undefined; }
    const loops = values.map((value, index) =>
      Animated.loop(Animated.sequence([
        Animated.delay(index * 90),
        Animated.timing(value, { toValue: BARS[index]!, duration: 380 + index * 40, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.3, duration: 420 + index * 30, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])));
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, reduced, values]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 22 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: color, opacity: active ? 1 : 0.35, transform: [{ scaleY: value }] }}
        />
      ))}
    </View>
  );
}
