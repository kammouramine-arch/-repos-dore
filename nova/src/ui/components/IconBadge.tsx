import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/ui/theme';

export type IconBadgeTone = 'neutral' | 'accent' | 'danger' | 'success';

export interface IconBadgeProps {
  name: keyof typeof Ionicons.glyphMap;
  tone?: IconBadgeTone;
  size?: number;
}

const BACKGROUNDS: Record<IconBadgeTone, string> = {
  neutral: colors.surfaceHighlight,
  accent: colors.accentMuted,
  danger: colors.dangerMuted,
  success: 'rgba(50, 215, 75, 0.14)',
};

const FOREGROUNDS: Record<IconBadgeTone, string> = {
  neutral: colors.textSecondary,
  accent: colors.accent,
  danger: colors.danger,
  success: colors.success,
};

/** Rounded-square icon container used across lists, rows and empty states. */
export const IconBadge = ({ name, tone = 'neutral', size = 38 }: IconBadgeProps) => (
  <View
    style={[
      styles.badge,
      {
        width: size,
        height: size,
        borderRadius: size / 2.6,
        backgroundColor: BACKGROUNDS[tone],
      },
    ]}
  >
    <Ionicons name={name} size={size * 0.5} color={FOREGROUNDS[tone]} />
  </View>
);

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
