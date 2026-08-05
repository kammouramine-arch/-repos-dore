import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { DistanceUnit } from '@/core/domain/entities/preferences';
import { AppText, GlassPanel, ManeuverIcon } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';
import { formatDistance } from '@/utils/format';

export interface ManeuverBannerProps {
  progress: NavigationProgress;
  unit: DistanceUnit;
}

/**
 * The one thing a driver looks at. Distance is the largest element on screen,
 * the instruction sits beside it, and the following maneuver is demoted to a
 * single quiet line.
 */
export const ManeuverBanner = ({ progress, unit }: ManeuverBannerProps) => (
  <GlassPanel style={styles.banner}>
    <View style={styles.primary}>
      <ManeuverIcon maneuver={progress.currentStep.maneuver} size={46} />

      <View style={styles.text}>
        <AppText variant="maneuver">
          {formatDistance(progress.distanceToManeuverMeters, unit)}
        </AppText>
        <AppText variant="callout" tone="secondary" numberOfLines={2}>
          {progress.currentStep.instruction}
        </AppText>
      </View>
    </View>

    {progress.nextStep ? (
      <Animated.View
        key={progress.nextStep.id}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(140)}
        style={styles.then}
      >
        <ManeuverIcon
          maneuver={progress.nextStep.maneuver}
          size={18}
          color={colors.textTertiary}
        />
        <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
          Then {progress.nextStep.instruction.toLowerCase()}
        </AppText>
      </Animated.View>
    ) : null}
  </GlassPanel>
);

const styles = StyleSheet.create({
  banner: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  then: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
