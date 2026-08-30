import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';

/**
 * Three pulsing dots while the assistant is working.
 *
 * The label changes as the wait stretches, because a request that routes to a slower
 * provider or runs tools can take a while and a frozen "Thinking…" reads as a hang.
 * The wording never claims a step that is not happening — it just admits it is slow.
 */
export function TypingIndicator({ label }: { label?: string }) {
  const theme = useTheme();
  const [elapsed, setElapsed] = React.useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const caption = label ?? (elapsed < 4 ? 'Thinking…' : elapsed < 12 ? 'Working on it…' : 'Still working — this one is taking longer than usual');

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={caption}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xs }}
    >
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} />
        ))}
      </View>
      <Text variant="footnote" color="tertiary" style={{ flex: 1 }}>
        {caption}
      </Text>
    </View>
  );
}

function Dot({ index }: { index: number }) {
  const theme = useTheme();
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withDelay(
      index * 160,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [index, value]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.32 + value.value * 0.62,
    transform: [{ scale: 0.82 + value.value * 0.28 }],
  }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
        style,
      ]}
    />
  );
}
