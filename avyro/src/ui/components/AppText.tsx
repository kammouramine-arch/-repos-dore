import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography, type TextVariant } from '@/ui/theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'inverted'
  | 'danger'
  | 'success';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: 'auto' | 'left' | 'right' | 'center';
}

const tones = StyleSheet.create({
  primary: { color: colors.textPrimary },
  secondary: { color: colors.textSecondary },
  tertiary: { color: colors.textTertiary },
  accent: { color: colors.accent },
  inverted: { color: colors.textInverted },
  danger: { color: colors.danger },
  success: { color: colors.success },
});

/**
 * Every piece of text in Avyro goes through here. Raw `<Text>` is how a type
 * scale erodes one screen at a time.
 */
export const AppText = ({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  ...rest
}: AppTextProps) => (
  <Text
    {...rest}
    style={[typography[variant], tones[tone], align ? { textAlign: align } : null, style]}
  />
);
