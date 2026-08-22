import React, { useEffect, useState } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

/** Shimmering placeholder used instead of blank screens while data loads. */
export function Skeleton({
  height = 16,
  width = '100%',
  radius,
  style,
}: {
  height?: number;
  width?: ViewStyle['width'];
  radius?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    if (theme.reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, theme.reduceMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          height,
          width,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.skeleton,
          opacity: theme.reduceMotion ? 0.7 : opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const theme = useTheme();
  return (
    <>
      <Skeleton height={18} width="52%" />
      <Skeleton height={12} width="82%" style={{ marginTop: theme.spacing.sm }} />
      <Skeleton height={12} width="68%" style={{ marginTop: theme.spacing.xs }} />
    </>
  );
}
