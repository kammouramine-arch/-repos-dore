import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { VoiceTone } from '@/core/conversation/voicePrompt';
import { colors, motion } from '@/ui/theme';

export interface VoiceOrbProps {
  tone: VoiceTone;
  size?: number;
}

const TONE_COLOR: Record<VoiceTone, string> = {
  idle: colors.textTertiary,
  listening: colors.accent,
  thinking: colors.accent,
  speaking: colors.success,
  error: colors.danger,
};

/**
 * The one thing on screen that says the microphone is live.
 *
 * Listening breathes, thinking pulses faster, speaking and errors hold steady.
 * Motion is deliberately restrained: this sits in a driver's peripheral vision
 * and its job is to be readable in a glance, not to be looked at.
 */
export const VoiceOrb = ({ tone, size = 12 }: VoiceOrbProps) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (tone === 'listening') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else if (tone === 'thinking') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: motion.fast });
    }

    return () => cancelAnimation(pulse);
  }, [tone, pulse]);

  const halo = useAnimatedStyle(() => ({
    opacity: 0.10 + pulse.value * 0.34,
    transform: [{ scale: 1 + pulse.value * 0.85 }],
  }));

  const core = useAnimatedStyle(() => ({
    opacity: 0.72 + pulse.value * 0.28,
  }));

  const color = TONE_COLOR[tone];

  return (
    <View style={[styles.root, { width: size * 2.6, height: size * 2.6 }]}>
      <Animated.View
        style={[
          styles.ring,
          { backgroundColor: color, width: size * 2, height: size * 2, borderRadius: size },
          halo,
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
          core,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  core: {
    position: 'absolute',
  },
});
