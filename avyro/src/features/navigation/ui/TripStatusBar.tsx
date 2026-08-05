import { StyleSheet, View } from 'react-native';

import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { DistanceUnit } from '@/core/domain/entities/preferences';
import { AppText, Button, GlassPanel } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { formatArrivalTime, formatDistance, formatDuration } from '@/utils/format';

export interface TripStatusBarProps {
  progress: NavigationProgress;
  unit: DistanceUnit;
  onEnd: () => void;
}

/** Arrival time, what is left, and the way out. */
export const TripStatusBar = ({ progress, unit, onEnd }: TripStatusBarProps) => (
  <GlassPanel style={styles.bar}>
    <View style={styles.figures}>
      <AppText variant="title2">
        {formatArrivalTime(progress.remainingDurationSeconds)}
      </AppText>
      <AppText variant="footnote" tone="tertiary">
        {formatDuration(progress.remainingDurationSeconds)} ·{' '}
        {formatDistance(progress.remainingDistanceMeters, unit)}
      </AppText>
    </View>

    <Button
      label="End"
      variant="danger"
      size="medium"
      onPress={onEnd}
      style={styles.end}
    />
  </GlassPanel>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  figures: {
    gap: 1,
  },
  end: {
    minWidth: 96,
  },
});
