import { StyleSheet, View } from 'react-native';

import { spacing } from '@/ui/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface SectionHeaderProps {
  title: string;
  /** Optional trailing action, e.g. `Clear`. */
  actionLabel?: string;
  onActionPress?: () => void;
}

export const SectionHeader = ({
  title,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) => (
  <View style={styles.header}>
    <AppText variant="overline" tone="tertiary">
      {title}
    </AppText>

    {actionLabel && onActionPress ? (
      <PressableScale
        accessibilityRole="button"
        onPress={onActionPress}
        hitSlop={10}
        style={styles.action}
      >
        <AppText variant="footnote" tone="accent">
          {actionLabel}
        </AppText>
      </PressableScale>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  action: {
    paddingHorizontal: spacing.xxs,
  },
});
