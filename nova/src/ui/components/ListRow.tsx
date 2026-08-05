import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/ui/theme';
import { AppText } from './AppText';
import { IconBadge, type IconBadgeTone } from './IconBadge';
import { PressableScale } from './PressableScale';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: IconBadgeTone;
  /** Right-hand content: a value, a switch, anything. */
  trailing?: ReactNode;
  /** Adds a chevron. Set automatically when the row is pressable. */
  showChevron?: boolean;
  onPress?: () => void;
}

/** The single row primitive behind search results, recents and settings. */
export const ListRow = ({
  title,
  subtitle,
  icon,
  iconTone = 'neutral',
  trailing,
  showChevron,
  onPress,
}: ListRowProps) => {
  const chevron = showChevron ?? (Boolean(onPress) && !trailing);

  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      disabled={!onPress}
      onPress={onPress}
      activeScale={0.985}
      style={styles.row}
    >
      {icon ? <IconBadge name={icon} tone={iconTone} /> : null}

      <View style={styles.text}>
        <AppText variant="callout" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {trailing}
      {chevron ? (
        <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
      ) : null}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 60,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
