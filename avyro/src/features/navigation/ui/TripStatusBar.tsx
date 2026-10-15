import { StyleSheet } from 'react-native';

import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { DistanceUnit } from '@/core/domain/entities/preferences';
import { AppText, Button, GlassPanel, PressableScale } from '@/ui/components';
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
  onDetails: () => void;
  destinationName?: string;
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
  onDetails,
  destinationName,
}: TripStatusBarProps) => {
  const road = progress.currentStep.roadName;

  return (
    <GlassPanel style={styles.bar}>
      <PressableScale style={styles.figures} accessibilityRole="button" accessibilityLabel="Trip details" onPress={onDetails}>
        <AppText variant="caption" tone="accent" numberOfLines={1}>{destinationName ?? 'Your destination'} · Details ⌃</AppText>
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
      </PressableScale>

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
    flex: 1,
    minHeight: 74,
    justifyContent: 'center',
    gap: 1,
  },
  end: {
    minWidth: 88,
  },
});
