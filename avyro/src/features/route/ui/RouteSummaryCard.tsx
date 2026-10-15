import { t, useUiLanguage } from '@/ui/i18n';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Place } from '@/core/domain/entities/place';
import type { DistanceUnit } from '@/core/domain/entities/preferences';
import type { Route } from '@/core/domain/entities/route';
import { AppText, Button, Divider, GlassPanel } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';
import { formatArrivalTime, formatDistance, formatDuration } from '@/utils/format';
import { RouteOptionList } from './RouteOptionList';

export interface RouteSummaryCardProps {
  destination: Place | null;
  routes: readonly Route[];
  selectedRoute: Route | null;
  selectedRouteId: string | null;
  unit: DistanceUnit;
  planning: boolean;
  error: string | null;
  onSelectRoute: (routeId: string) => void;
  onStart: () => void;
  onRetry: () => void;
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <AppText variant="title3">{value}</AppText>
    <AppText variant="caption" tone="tertiary">
      {label}
    </AppText>
  </View>
);

/** Everything the driver needs to decide, and one button to commit. */
export const RouteSummaryCard = ({
  destination,
  routes,
  selectedRoute,
  selectedRouteId,
  unit,
  planning,
  error,
  onSelectRoute,
  onStart,
  onRetry,
}: RouteSummaryCardProps) => { useUiLanguage(); return ((
  <GlassPanel style={styles.card}>
    <View style={styles.header}>
      <AppText variant="title3" numberOfLines={1}>
        {destination?.name ?? t("Destination")}
      </AppText>
      <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
        {destination?.address ?? ''}
      </AppText>
    </View>

    {planning ? (
      <View style={styles.pending}>
        <ActivityIndicator color={colors.accent} />
        <AppText variant="subhead" tone="secondary">
          {t("Planning your route…")}</AppText>
      </View>
    ) : null}

    {!planning && error ? (
      <View style={styles.pending}>
        <AppText variant="subhead" tone="danger" align="center">
          {error}
        </AppText>
        <Button label={t("Try again")} variant="secondary" size="medium" onPress={onRetry} />
      </View>
    ) : null}

    {!planning && !error && selectedRoute ? (
      <>
        <Divider />

        <View style={styles.metrics}>
          <Metric label={t("Time")} value={formatDuration(selectedRoute.durationSeconds)} />
          <Metric
            label={t("Distance")}
            value={formatDistance(selectedRoute.distanceMeters, unit)}
          />
          <Metric
            label={t("Arrival")}
            value={formatArrivalTime(selectedRoute.durationSeconds)}
          />
        </View>

        <RouteOptionList
          routes={routes}
          selectedRouteId={selectedRouteId}
          unit={unit}
          onSelect={onSelectRoute}
        />

        <Button label={t("Start navigation")} icon="navigate" onPress={onStart} />
        {selectedRoute.source === 'TomTom' ? <AppText variant="caption" tone="tertiary" align="center" style={{ fontSize: 9 }}>© TomTom</AppText> : null}
      </>
    ) : null}
  </GlassPanel>
)); };

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
  },
  header: {
    gap: 2,
  },
  pending: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    gap: 2,
  },
});
