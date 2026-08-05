import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, spacing } from '@/ui/theme';

export interface PageDotsProps {
  count: number;
  width: number;
  scrollX: SharedValue<number>;
}

const DOT_SIZE = 7;

const Dot = ({ index, width, scrollX }: { index: number } & Omit<PageDotsProps, 'count'>) => {
  const range = [(index - 1) * width, index * width, (index + 1) * width];

  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [DOT_SIZE, DOT_SIZE * 3.4, DOT_SIZE], 'clamp'),
    backgroundColor: interpolateColor(scrollX.value, range, [
      colors.borderStrong,
      colors.accent,
      colors.borderStrong,
    ]),
  }));

  return <Animated.View style={[styles.dot, style]} />;
};

/** Page indicator whose active dot stretches as the pager moves. */
export const PageDots = ({ count, width, scrollX }: PageDotsProps) => (
  <View style={styles.row}>
    {Array.from({ length: count }, (_, index) => (
      <Dot key={index} index={index} width={width} scrollX={scrollX} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
