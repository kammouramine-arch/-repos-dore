import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

export type OrbState = 'idle' | 'thinking' | 'listening' | 'speaking';

/**
 * The assistant's visual presence: a soft orb that breathes when idle, accelerates
 * while thinking, and pulses wider while listening. Deliberately abstract — no robot.
 */
export function AIOrb({ size = 44, state = 'idle' }: { size?: number; state?: OrbState }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    if (theme.reduceMotion) {
      scale.value = 1;
      glow.value = state === 'idle' ? 0.35 : 0.6;
      return;
    }
    const config = {
      idle: { to: 1.045, duration: 2100, glow: 0.35 },
      thinking: { to: 1.1, duration: 620, glow: 0.7 },
      listening: { to: 1.16, duration: 900, glow: 0.85 },
      speaking: { to: 1.07, duration: 780, glow: 0.6 },
    }[state];

    scale.value = withRepeat(
      withSequence(
        withTiming(config.to, { duration: config.duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(config.glow, { duration: config.duration }),
        withTiming(config.glow * 0.55, { duration: config.duration }),
      ),
      -1,
      false,
    );
  }, [state, theme.reduceMotion, scale, glow]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size,
            backgroundColor: theme.colors.accent,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2 }, orbStyle]}>
        <LinearGradient
          colors={[theme.colors.accent, theme.scheme === 'dark' ? '#5B63E8' : '#8A92F2']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ flex: 1, borderRadius: size / 2 }}
        />
      </Animated.View>
    </View>
  );
}
