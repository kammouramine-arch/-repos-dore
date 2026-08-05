import { StyleSheet, View } from 'react-native';

import type { Place } from '@/core/domain/entities/place';
import { AppText, Button, GlassPanel, IconBadge } from '@/ui/components';
import { spacing } from '@/ui/theme';

export interface ArrivalCardProps {
  destination: Place | null;
  onDone: () => void;
}

export const ArrivalCard = ({ destination, onDone }: ArrivalCardProps) => (
  <GlassPanel style={styles.card}>
    <View style={styles.header}>
      <IconBadge name="checkmark-circle" tone="success" size={44} />
      <View style={styles.text}>
        <AppText variant="title3">You have arrived</AppText>
        <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
          {destination?.name ?? 'Destination reached'}
        </AppText>
      </View>
    </View>

    <Button label="Done" variant="secondary" onPress={onDone} />
  </GlassPanel>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
