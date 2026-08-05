import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/ui/theme';

export interface CardProps extends ViewProps {
  /** `elevated` sits on top of another surface; `plain` sits on the background. */
  level?: 'plain' | 'elevated';
  padded?: boolean;
}

/** The standard grouped container: one radius, one border, no shadow. */
export const Card = ({
  level = 'plain',
  padded = true,
  style,
  ...rest
}: CardProps) => (
  <View
    {...rest}
    style={[
      styles.base,
      level === 'elevated' ? styles.elevated : styles.plain,
      padded ? styles.padded : null,
      style,
    ]}
  />
);

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  plain: { backgroundColor: colors.surface },
  elevated: { backgroundColor: colors.surfaceElevated },
  padded: { padding: spacing.md },
});
