import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { APP_INFO } from '@/config';
import { AppText, AvyroMark, Screen } from '@/ui/components';
import { motion, spacing } from '@/ui/theme';

export interface SplashOverlayProps {
  /** Bootstrap finished — the splash may leave as soon as it has been seen. */
  ready: boolean;
  onFinished: () => void;
}

/** Minimum time on screen, so a fast launch still feels composed. */
const MINIMUM_VISIBLE_MS = motion.splash + 350;

/**
 * The first thing anyone sees. The mark settles with a spring, the wordmark
 * follows, and the whole thing dissolves — never cuts — into the app.
 */
export const SplashOverlay = ({ ready, onFinished }: SplashOverlayProps) => {
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  const markScale = useSharedValue(0.82);
  const markOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textShift = useSharedValue(14);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: motion.slow });
    markScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    textOpacity.value = withDelay(240, withTiming(1, { duration: motion.slow }));
    textShift.value = withDelay(240, withSpring(0, motion.spring));

    const timer = setTimeout(() => setMinimumElapsed(true), MINIMUM_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [markOpacity, markScale, textOpacity, textShift]);

  useEffect(() => {
    if (!ready || !minimumElapsed) return;

    overlayOpacity.value = withTiming(0, { duration: motion.base }, (finished) => {
      if (finished) runOnJS(onFinished)();
    });
  }, [ready, minimumElapsed, onFinished, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textShift.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
      <Screen backdrop="night" edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Animated.View style={markStyle}>
            <AvyroMark size={104} />
          </Animated.View>

          <Animated.View style={[styles.text, textStyle]}>
            <AppText variant="title1" style={styles.wordmark}>
              {APP_INFO.name.toUpperCase()}
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              {APP_INFO.tagline}
            </AppText>
          </Animated.View>
        </View>
      </Screen>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  text: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  wordmark: {
    letterSpacing: 9,
    marginLeft: 9,
  },
});
