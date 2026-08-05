import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText, IconBadge } from '@/ui/components';
import { spacing } from '@/ui/theme';
import type { OnboardingSlideContent } from '../onboardingContent';

export interface OnboardingSlideProps {
  slide: OnboardingSlideContent;
  index: number;
  width: number;
  scrollX: SharedValue<number>;
}

/**
 * One page. The artwork drifts at a different rate from the text, which is
 * what makes a horizontal pager feel like depth rather than like a filmstrip.
 */
export const OnboardingSlide = ({
  slide,
  index,
  width,
  scrollX,
}: OnboardingSlideProps) => {
  const range = [(index - 1) * width, index * width, (index + 1) * width];

  const artworkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], 'clamp'),
    transform: [
      { translateX: interpolate(scrollX.value, range, [width * 0.28, 0, -width * 0.28]) },
      { scale: interpolate(scrollX.value, range, [0.86, 1, 0.86], 'clamp') },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], 'clamp'),
    transform: [
      { translateX: interpolate(scrollX.value, range, [width * 0.5, 0, -width * 0.5]) },
    ],
  }));

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={artworkStyle}>
        <IconBadge name={slide.icon} tone="accent" size={104} />
      </Animated.View>

      <Animated.View style={[styles.text, textStyle]}>
        <AppText variant="title1" align="center">
          {slide.title}
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          {slide.body}
        </AppText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  text: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 340,
  },
});
