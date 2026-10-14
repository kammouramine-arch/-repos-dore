import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows } from '@/ui/theme';

export interface GlassPanelProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

/**
 * The floating panel used over the map.
 *
 * An opaque surface keeps text legible against moving cartography. One content
 * node preserves each caller's flex layout and avoids live blur work on scroll.
 */
export const GlassPanel = ({ children, style }: GlassPanelProps) => {
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
  solid: {
    backgroundColor: colors.surface,
  },
});
