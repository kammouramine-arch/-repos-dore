import { StyleSheet, type ViewStyle } from 'react-native';

import { haptics } from '@/ui/feedback/haptics';
import { colors, shadows, sizing } from '@/ui/theme';
import { PressableScale } from './PressableScale';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  name: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
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
  variant = 'floating',
  active = false,
  size = sizing.iconButton,
  style,
}: IconButtonProps) => (
  <PressableScale
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ selected: active }}
    activeScale={0.92}
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
    backgroundColor: colors.surface,
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
