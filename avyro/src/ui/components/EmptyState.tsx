import { StyleSheet, View } from 'react-native';

import { spacing } from '@/ui/theme';
import { AppText } from './AppText';
import { IconBadge } from './IconBadge';
import type { IconName } from './Icon';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
}

/** Shown when a list has nothing in it — and when that is expected, not broken. */
export const EmptyState = ({ icon, title, message }: EmptyStateProps) => (
  <View style={styles.container}>
    <IconBadge name={icon} size={52} />
    <View style={styles.text}>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="subhead" tone="tertiary" align="center">
          {message}
        </AppText>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  text: {
    gap: spacing.xxs,
    maxWidth: 280,
  },
});
