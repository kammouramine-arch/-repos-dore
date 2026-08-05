import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { haptics } from '@/ui/feedback/haptics';
import { colors, gradients, radius, sizing, spacing } from '@/ui/theme';
import { AppText, type TextTone } from './AppText';
import { PressableScale } from './PressableScale';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'large' | 'medium';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const TONES: Record<ButtonVariant, TextTone> = {
  primary: 'inverted',
  secondary: 'primary',
  ghost: 'accent',
  danger: 'danger',
};

const ICON_COLORS: Record<ButtonVariant, string> = {
  primary: colors.onAccent,
  secondary: colors.textPrimary,
  ghost: colors.accent,
  danger: colors.danger,
};

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const height = size === 'large' ? sizing.controlHeight : sizing.minTouchTarget;
  const surface = variant === 'secondary' ? styles.secondary : null;
  const dangerSurface = variant === 'danger' ? styles.danger : null;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={ICON_COLORS[variant]} />
      ) : (
        <>
          {icon ? (
            <Icon name={icon} size={19} color={ICON_COLORS[variant]} />
          ) : null}
          <AppText variant="headline" tone={TONES[variant]}>
            {label}
          </AppText>
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={[styles.base, { height, borderRadius: radius.lg }, style ?? {}]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, surface, dangerSurface]}>{content}</View>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.dangerMuted,
  },
});
