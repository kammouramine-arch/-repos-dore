import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/ui/theme';
import { AppText } from './AppText';
import { IconBadge, type IconBadgeTone } from './IconBadge';
import { PressableScale } from './PressableScale';
import { Icon, type IconName } from './Icon';

export interface ListRowProps {
  testID?: string;
  title: string;
  subtitle?: string;
  subtitleLines?: number;
  icon?: IconName;
  iconTone?: IconBadgeTone;
  /** Right-hand content: a value, a switch, anything. */
  trailing?: ReactNode;
  /** Adds a chevron. Set automatically when the row is pressable. */
  showChevron?: boolean;
  onPress?: () => void;
}

/** The single row primitive behind search results, recents and settings. */
export const ListRow = ({
  testID,
  title,
  subtitle,
  subtitleLines = 1,
  icon,
  iconTone = 'neutral',
  trailing,
  showChevron,
  onPress,
}: ListRowProps) => {
  const chevron = showChevron ?? (Boolean(onPress) && !trailing);

  const content = <>
      {icon ? <IconBadge name={icon} tone={iconTone} /> : null}

      <View style={styles.text}>
        <AppText variant="callout" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="tertiary" numberOfLines={subtitleLines}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {trailing}
      {chevron ? (
        <Icon name="chevron-forward" size={17} color={colors.textTertiary} />
      ) : null}
    </>;
  // Informational rows are not disabled buttons. In particular, keep trailing
  // switches exposed to VoiceOver and render their labels at full contrast.
  return onPress ? <PressableScale testID={testID} accessibilityRole="button"
    accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    onPress={onPress} activeScale={0.985} style={styles.row}>{content}</PressableScale>
    : <View testID={testID} style={styles.row}>{content}</View>;
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
