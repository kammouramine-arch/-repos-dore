import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { haptics } from '@/ui/feedback/haptics';
import { colors, shadows, sizing } from '@/ui/theme';
import { PressableScale } from './PressableScale';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  name: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
  /** `floating` is for controls sitting directly on the map. */
  variant?: 'floating' | 'plain';
  active?: boolean;
  size?: number;
  style?: ViewStyle;
}

/** Circular control: back, recenter, settings, close. */
export const IconButton = ({
  name,
  accessibilityLabel,
  onPress,
  onLongPress,
  accessibilityHint,
  variant = 'floating',
  active = false,
  size = sizing.iconButton,
  style,
}: IconButtonProps) => (
  <PressableScale haptic={false}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ selected: active }}
    activeScale={0.92}
    onLongPress={onLongPress}
    onPress={() => {
      haptics.tap();
      onPress?.();
    }}
    style={[
      styles.base,
      { width: size, height: size, borderRadius: size / 2 },
      variant === 'floating' ? styles.floating : styles.plain,
      active ? styles.active : {},
      style ?? {},
    ]}
  >
    {variant === 'floating' && Platform.OS === 'ios' ? <BlurView pointerEvents="none" tint="systemUltraThinMaterialLight" intensity={65} style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]} /> : null}
    <Icon
      name={name}
      size={size * 0.46}
      color={active ? colors.accent : colors.textPrimary}
    />
  </PressableScale>
);

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floating: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(221,239,240,0.42)' : colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    ...shadows.control,
  },
  plain: {
    backgroundColor: colors.surfaceHighlight,
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
});
