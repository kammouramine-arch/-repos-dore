import { StyleSheet, View } from 'react-native';

import type { DistanceUnit } from '@/core/domain/entities/preferences';
import type { Route } from '@/core/domain/entities/route';
import { AppText, PressableScale } from '@/ui/components';
import { colors, radius, spacing } from '@/ui/theme';
import { formatDistance, formatDuration } from '@/utils/format';

export interface RouteOptionListProps {
  routes: readonly Route[];
  selectedRouteId: string | null;
  unit: DistanceUnit;
  onSelect: (routeId: string) => void;
}

/** Alternatives, fastest first. Hidden entirely when there is only one way. */
export const RouteOptionList = ({
  routes,
  selectedRouteId,
  unit,
  onSelect,
}: RouteOptionListProps) => {
  if (routes.length < 2) return null;

  const fastest = routes[0];

  return (
    <View style={styles.row}>
      {routes.map((route) => {
        const selected = route.id === selectedRouteId;
        const delta = Math.round((route.durationSeconds - fastest.durationSeconds) / 60);

        return (
          <PressableScale
            key={route.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(route.id)}
            style={[styles.option, selected ? styles.selected : styles.unselected]}
          >
            <AppText variant="headline" tone={selected ? 'accent' : 'primary'}>
              {formatDuration(route.durationSeconds)}
            </AppText>
            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
              {formatDistance(route.distanceMeters, unit)} · {route.summary}
            </AppText>
            <AppText variant="caption" tone={delta > 0 ? 'tertiary' : 'success'}>
              {delta > 0 ? `+${delta} min` : 'Fastest'}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  unselected: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: 'transparent',
  },
});
