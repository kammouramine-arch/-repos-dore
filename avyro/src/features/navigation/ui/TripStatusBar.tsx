import { StyleSheet, View } from 'react-native';

import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { DistanceUnit } from '@/core/domain/entities/preferences';
import { AppText, Button, GlassPanel } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';
import {
  formatArrivalTime,
  formatDistance,
  formatDuration,
  formatSpeed,
  speedUnitLabel,
} from '@/utils/format';

export interface TripStatusBarProps {
  progress: NavigationProgress;
  unit: DistanceUnit;
  /** Ground speed in m/s, or null when the platform reports nothing. */
  speedMetersPerSecond: number | null;
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
  speedMetersPerSecond,
  onEnd,
}: TripStatusBarProps) => {
  const speed = formatSpeed(speedMetersPerSecond, unit);
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

      {speed ? (
        <View style={styles.speed}>
          <AppText variant="title3">{speed}</AppText>
          <AppText variant="caption" tone="tertiary">
            {speedUnitLabel(unit)}
          </AppText>
        </View>
      ) : null}

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
  speed: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  end: {
    minWidth: 88,
  },
});
