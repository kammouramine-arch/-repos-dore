import React from 'react';
import { Pressable, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export type CardProps = ViewProps & {
  padded?: boolean;
  tone?: 'surface' | 'alt' | 'accent' | 'sunken';
  elevated?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
};

export function Card({
  padded = true,
  tone = 'surface',
  elevated = true,
  onPress,
  style,
  children,
  accessibilityLabel,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const bg = {
    surface: theme.colors.surface,
    alt: theme.colors.surfaceAlt,
    accent: theme.colors.accentSoft,
    sunken: theme.colors.surfaceSunken,
  }[tone];

  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: theme.radius.lg,
    padding: padded ? theme.spacing.base : 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...(elevated && tone === 'surface' ? theme.elevation.card : null),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          base,
          { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed && !theme.reduceMotion ? 0.995 : 1 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View {...rest} accessibilityLabel={accessibilityLabel} style={[base, style]}>
      {children}
    </View>
  );
}
