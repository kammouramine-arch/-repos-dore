import { StyleSheet, View } from 'react-native';

import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { DistanceUnit } from '@/core/domain/entities/preferences';
import { AppText, Button, GlassPanel } from '@/ui/components';
import { spacing } from '@/ui/theme';
import {
  formatArrivalTime,
  formatDistance,
  formatDuration,
} from '@/utils/format';

export interface TripStatusBarProps {
  progress: NavigationProgress;
  unit: DistanceUnit;
  onEnd: () => void;
}

/**
 * Arrival time, what is left, how fast, what road — and the way out.
 *
 * Ordered by how often a driver actually looks: arrival first and largest,
 * then the two numbers that qualify it, then the road they are on. Speed sits
 * apart on the right because it answers a different question and should never
 * be confused with a distance.
 *
 * Every value here is measured. Speed is omitted rather than shown as zero
 * when CoreLocation reports nothing, and the road name only appears when the
 * routing provider supplied one.
 */
export const TripStatusBar = ({
  progress,
  unit,
  onEnd,
}: TripStatusBarProps) => {
  const road = progress.currentStep.roadName;

  return (
    <GlassPanel style={styles.bar}>
      <View style={styles.figures}>
        <AppText variant="title2">
          {formatArrivalTime(progress.remainingDurationSeconds)}
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          {formatDuration(progress.remainingDurationSeconds)} ·{' '}
          {formatDistance(progress.remainingDistanceMeters, unit)}
        </AppText>
        {road ? (
          <AppText variant="footnote" tone="secondary" numberOfLines={1}>
            {road}
          </AppText>
        ) : null}
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
};

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
    flexShrink: 1,
    gap: 1,
  },
  end: {
    minWidth: 88,
  },
});
