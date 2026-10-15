import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Original perimeter light: capture energy only comes from the live microphone. */
export function VoiceFrame({ active, state, level }: { active: boolean; state: string; level: number }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(pulse);
    if (!active || reduced) { pulse.value = 0; return; }
    pulse.value = state === 'listening' ? withTiming(Math.max(0, Math.min(1, level)), { duration: 100 })
      : withRepeat(withSequence(withTiming(1, { duration: state === 'thinking' ? 1400 : 900 }), withTiming(0, { duration: 1100 })), -1);
    return () => cancelAnimation(pulse);
  }, [active, state, level, reduced, pulse]);
  const glow = useAnimatedStyle(() => ({ opacity: .55 + pulse.value * .4 }));
  if (!active) return null;
  const color = state === 'thinking' ? '#A798F5' : state === 'speaking' ? '#FFD89C' : '#53E5C5';
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glow]}>
    <Svg width={width} height={height}>
      <Defs><LinearGradient id="meepmeep-edge" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={color} /><Stop offset=".52" stopColor="#56A7EA" /><Stop offset="1" stopColor={color} /></LinearGradient></Defs>
      <Rect x={5} y={5} width={width - 10} height={height - 10} rx={43} fill="none" stroke="url(#meepmeep-edge)" strokeWidth={10} opacity={.16} />
      <Rect x={3} y={3} width={width - 6} height={height - 6} rx={44} fill="none" stroke="url(#meepmeep-edge)" strokeWidth={3} />
    </Svg>
  </Animated.View>;
}
