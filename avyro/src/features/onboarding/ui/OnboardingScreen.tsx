import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { useOnboardingStore } from '@/app/stores/hooks';
import { AppText, Button, PressableScale, Screen } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { ONBOARDING_SLIDES } from '../onboardingContent';
import { OnboardingSlide } from './OnboardingSlide';
import { PageDots } from './PageDots';

const LAST_INDEX = ONBOARDING_SLIDES.length - 1;

export const OnboardingScreen = () => {
  const { width } = useWindowDimensions();
  const complete = useOnboardingStore((state) => state.complete);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const goNext = () => {
    if (index >= LAST_INDEX) {
      void complete();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <Screen backdrop="night" padded={false}>
      <View style={styles.skip}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => void complete()}
          hitSlop={12}
        >
          <AppText variant="subhead" tone="tertiary">
            Skip
          </AppText>
        </PressableScale>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        style={styles.pager}
      >
        {ONBOARDING_SLIDES.map((slide, slideIndex) => (
          <OnboardingSlide
            key={slide.key}
            slide={slide}
            index={slideIndex}
            width={width}
            scrollX={scrollX}
          />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <PageDots count={ONBOARDING_SLIDES.length} width={width} scrollX={scrollX} />
        <Button
          label={index >= LAST_INDEX ? 'Get started' : 'Continue'}
          onPress={goNext}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  skip: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  pager: {
    flex: 1,
  },
  footer: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
});
