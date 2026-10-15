import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { colors, radius, shadows } from '@/ui/theme';

export interface GlassPanelProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

/**
 * The floating panel used over the map.
 *
 * A tinted native material separates text from the moving map while retaining
 * its colour underneath. The blur is absolute so caller flex layouts stay intact.
 */
export const GlassPanel = ({ children, style, intensity = 65 }: GlassPanelProps) => {
  return <View style={[styles.panel, styles.solid, style]}>
    {Platform.OS === 'ios' ? <BlurView pointerEvents="none" tint="systemUltraThinMaterialLight" intensity={intensity} style={StyleSheet.absoluteFill} /> : null}
    {children}
  </View>;
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
    ...shadows.floating,
  },
  solid: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(221,239,240,0.42)' : colors.surface,
  },
});
