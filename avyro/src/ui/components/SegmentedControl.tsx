import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { haptics } from '@/ui/feedback/haptics';
import { colors, motion, radius, spacing } from '@/ui/theme';
import { AppText } from './AppText';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const TRACK_PADDING = 3;

/** iOS-style segmented picker with a spring-tracked selection pill. */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth =
    options.length > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: withSpring(activeIndex * segmentWidth, motion.spring) }],
  }));

  return (
    <View
      style={styles.track}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 ? (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      ) : null}

      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: option.value === value }}
          style={styles.segment}
          onPress={() => {
            if (option.value === value) return;
            haptics.selection();
            onChange(option.value);
          }}
        >
          <AppText
            variant="subhead"
            tone={option.value === value ? 'primary' : 'tertiary'}
            numberOfLines={1}
          >
            {option.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: TRACK_PADDING,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHighlight,
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: radius.md - TRACK_PADDING,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    minHeight: 34,
  },
});
