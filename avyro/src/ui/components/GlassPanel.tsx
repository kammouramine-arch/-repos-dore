import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows } from '@/ui/theme';

export interface GlassPanelProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

/**
 * The floating panel used over the map.
 *
 * Blur is a genuine improvement on iOS, where the map keeps showing through.
 * On Android it is expensive and inconsistent while the map animates, so there
 * we use an opaque surface instead — the same shape, without the jank.
 */
export const GlassPanel = ({ children, style, intensity = 42 }: GlassPanelProps) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="dark" style={[styles.panel, style]}>
        <View style={styles.iosTint}>{children}</View>
      </BlurView>
    );
  }

  return <View style={[styles.panel, styles.solid, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    ...shadows.floating,
  },
  iosTint: {
    backgroundColor: 'rgba(10, 12, 17, 0.55)',
  },
  solid: {
    backgroundColor: colors.surface,
  },
});
