import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * A deliberately restrained blue-to-white surface used by launch and auth.
 * Keeping the gradient in one native SVG avoids another UI dependency and
 * gives the iPhone the same smooth transition at every density.
 */
export function PremiumGradient({
  children,
  style,
  dark = false,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Dark mode is for the launch/auth hero; the default is a softer page tint. */
  dark?: boolean;
}) {
  // The light variant is intentionally pale enough for dark editorial text;
  // the dark variant carries the richer launch/auth contrast.
  const top = dark ? colors.accentDeep : '#D6E0FF';
  const middle = dark ? colors.accent : colors.accentSoft;
  return (
    <View style={[styles.root, style]}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="devisera-premium-gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} stopOpacity="1" />
            <Stop offset={dark ? "0.38" : "0.2"} stopColor={middle} stopOpacity={dark ? "0.98" : "0.82"} />
            <Stop offset={dark ? "0.68" : "0.56"} stopColor={colors.accentSoft} stopOpacity={dark ? "0.96" : "0.72"} />
            <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#devisera-premium-gradient)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});
