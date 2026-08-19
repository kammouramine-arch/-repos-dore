import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '@/theme';
import type { TypeVariant } from '@/theme/tokens';

export type AppTextProps = RNTextProps & {
  variant?: TypeVariant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'inverse' | 'danger' | 'success' | 'onAccent';
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
};

/**
 * All copy in the app goes through this component so the type scale, colour roles
 * and dynamic type behaviour stay consistent.
 */
export function Text({
  variant = 'body',
  color = 'primary',
  align,
  weight,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const colorMap = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    accent: theme.colors.accentText,
    inverse: theme.colors.textInverse,
    danger: theme.colors.danger,
    success: theme.colors.success,
    onAccent: theme.colors.onAccent,
  } as const;

  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        theme.typography[variant],
        { color: colorMap[color] },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}
