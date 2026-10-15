import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Avyro's own edge light. It indicates a live conversation, never always-on recording. */
export function VoiceFrame({ active }: { active: boolean }) {
  const { width, height } = useWindowDimensions();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = active ? withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1) : 0;
    return () => cancelAnimation(pulse);
  }, [active, pulse]);
  const glow = useAnimatedStyle(() => ({ opacity: .48 + pulse.value * .42 }));
  if (!active) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glow]}>
    <Svg width={width} height={height}>
      <Defs><LinearGradient id="avyro-voice-edge" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#28DDD0" /><Stop offset=".48" stopColor="#467CF5" /><Stop offset="1" stopColor="#B4EECD" /></LinearGradient></Defs>
      <Rect x={5} y={5} width={width - 10} height={height - 10} rx={43} fill="none" stroke="url(#avyro-voice-edge)" strokeWidth={11} opacity={.17} />
      <Rect x={3} y={3} width={width - 6} height={height - 6} rx={44} fill="none" stroke="url(#avyro-voice-edge)" strokeWidth={3} />
    </Svg>
  </Animated.View>;
}
