import { StyleSheet, View } from 'react-native';

import type { User } from '@/core/domain/entities/user';
import { AppText, Card } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';
import { initialsOf } from '@/utils/format';

export interface AccountCardProps {
  user: User | null;
}

export const AccountCard = ({ user }: AccountCardProps) => (
  <Card style={styles.card}>
    <View style={styles.avatar}>
      <AppText variant="title3">{initialsOf(user?.fullName ?? '')}</AppText>
    </View>

    <View style={styles.details}>
      <AppText variant="headline" numberOfLines={1}>
        {user?.fullName ?? 'Guest mode'}
      </AppText>
      <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
        {user?.email ?? 'Your saved places stay on this iPhone'}
      </AppText>
    </View>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
  },
  details: {
    flex: 1,
    gap: 2,
  },
});
