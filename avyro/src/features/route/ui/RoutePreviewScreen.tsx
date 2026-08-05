import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActiveRoute, useLocationStore, useNavigationStore, usePreferencesStore, useTripStore } from '@/app/stores/hooks';
import { MAP_DEFAULTS } from '@/config';
import { DestinationMarker } from '@/maps/components/DestinationMarker';
import { AvyroMapView } from '@/maps/components/AvyroMapView';
import { RouteOverlay } from '@/maps/components/RouteOverlay';
import { UserPuck } from '@/maps/components/UserPuck';
import { IconButton } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { RouteSummaryCard } from './RouteSummaryCard';

/**
 * The moment of commitment: the whole trip on screen, the alternatives beside
 * it, and one button to start driving.
 */
export const RoutePreviewScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { destination, plan, selectedRouteId, planning, error, selectRoute, planTrip } =
    useTripStore();
  const selectedRoute = useActiveRoute();
  const position = useLocationStore((state) => state.position);
  const preferences = usePreferencesStore((state) => state.preferences);
  const startGuidance = useNavigationStore((state) => state.start);

  useEffect(() => {
    if (!selectedRoute) return;

    mapRef.current?.fitToCoordinates(selectedRoute.geometry, {
      edgePadding: MAP_DEFAULTS.routeFitPadding,
      animated: true,
    });
  }, [selectedRoute]);

  const start = () => {
    if (!selectedRoute || !destination) return;
    startGuidance(selectedRoute, destination);
    navigation.navigate('Guidance');
  };

  const retry = () => {
    const origin = position?.coordinates;
    if (!destination || !origin) return;
    void planTrip(destination, origin);
  };

  return (
    <View style={styles.root}>
      <AvyroMapView
        mapRef={mapRef}
        appearance={preferences.mapStyle}
        showsTraffic={preferences.showTraffic}
        initialRegion={
          position
            ? { ...position.coordinates, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : MAP_DEFAULTS.fallbackRegion
        }
      >
        {plan ? (
          <RouteOverlay
            routes={plan.routes}
            selectedRouteId={selectedRouteId ?? ''}
            onSelectRoute={selectRoute}
          />
        ) : null}

        {destination ? (
          <DestinationMarker
            coordinate={destination.coordinates}
            title={destination.name}
          />
        ) : null}

        {position ? (
          <UserPuck coordinate={position.coordinates} headingDegrees={position.heading} />
        ) : null}
      </AvyroMapView>

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton
          name="chevron-back"
          accessibilityLabel="Back to map"
          onPress={() => navigation.goBack()}
        />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}>
        <RouteSummaryCard
          destination={destination}
          routes={plan?.routes ?? []}
          selectedRoute={selectedRoute}
          selectedRouteId={selectedRouteId}
          unit={preferences.distanceUnit}
          planning={planning}
          error={error}
          onSelectRoute={selectRoute}
          onStart={start}
          onRetry={retry}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
  },
  bottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
  },
});
