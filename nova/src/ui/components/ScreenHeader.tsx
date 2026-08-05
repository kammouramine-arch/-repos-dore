import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { sizing, spacing } from '@/ui/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  /** Right-hand slot, e.g. an action button. */
  trailing?: ReactNode;
}

/**
 * Nova draws its own headers rather than using the navigator's, so a title bar
 * over the map and one over a list look and animate identically.
 */
export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  trailing,
}: ScreenHeaderProps) => (
  <View style={styles.header}>
    <View style={styles.side}>
      {onBack ? (
        <IconButton
          name="chevron-back"
          accessibilityLabel="Go back"
          variant="plain"
          onPress={onBack}
        />
      ) : null}
    </View>

    <View style={styles.titles}>
      {title ? (
        <AppText variant="headline" align="center" numberOfLines={1}>
          {title}
        </AppText>
      ) : null}
      {subtitle ? (
        <AppText variant="caption" tone="tertiary" align="center" numberOfLines={1}>
          {subtitle}
        </AppText>
      ) : null}
    </View>

    <View style={[styles.side, styles.trailing]}>{trailing}</View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  side: {
    minWidth: sizing.iconButton,
  },
  titles: {
    flex: 1,
    gap: 1,
  },
  trailing: {
    alignItems: 'flex-end',
  },
});
