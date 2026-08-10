import { useNavigation } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useLocationStore,
  useNavigationStore,
  usePreferencesStore,
} from '@/app/stores/hooks';
import { MAP_DEFAULTS } from '@/config';
import { ActiveRouteOverlay } from '@/maps/components/ActiveRouteOverlay';
import { DestinationMarker } from '@/maps/components/DestinationMarker';
import { AvyroMapView } from '@/maps/components/AvyroMapView';
import { UserPuck } from '@/maps/components/UserPuck';
import { AppText, GlassPanel } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { useGuidanceSession } from '../hooks/useGuidanceSession';
import { ArrivalCard } from './ArrivalCard';
import { GuidanceControls } from './GuidanceControls';
import { ManeuverBanner } from './ManeuverBanner';
import { TripStatusBar } from './TripStatusBar';

const KEEP_AWAKE_TAG = 'avyro-guidance';

/**
 * Active guidance. The camera rides behind the driver — pitched, rotated to
 * the direction of travel — until they touch the map, at which point control
 * is theirs until they ask for it back.
 */
export const GuidanceScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [following, setFollowing] = useState(true);
  // Overview suspends the follow camera and fits the whole route, so a driver
  // stopped at lights can see what is coming without losing their place.
  const [overview, setOverview] = useState(false);

  // One selector per slice: the map subtree below re-renders on every fix, and
  // subscribing to the whole store would add every unrelated field to that.
  const status = useNavigationStore((state) => state.status);
  const routeIndex = useNavigationStore((state) => state.routeIndex);
  const destination = useNavigationStore((state) => state.destination);
  const progress = useNavigationStore((state) => state.progress);
  const stop = useNavigationStore((state) => state.stop);
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore((state) => state.update);
  const lastPosition = useLocationStore((state) => state.position);
  const route = useNavigationStore((state) => state.route);

  useGuidanceSession();

  useEffect(() => {
    if (!preferences.keepScreenAwake) return;

    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [preferences.keepScreenAwake]);

  useEffect(() => {
    if (!progress || !following || overview) return;

    mapRef.current?.animateCamera(
      {
        center: progress.snappedPosition,
        heading: progress.courseDegrees,
        pitch: MAP_DEFAULTS.navigationCamera.pitch,
        zoom: MAP_DEFAULTS.navigationCamera.zoom,
        altitude: MAP_DEFAULTS.navigationCamera.altitude,
      },
      { duration: 850 },
    );
  }, [progress, following, overview]);

  // Fitting the route is a one-shot action, not a camera that tracks: the
  // driver asked to see the trip, not to have it recomposed under them.
  useEffect(() => {
    if (!overview || !route) return;

    mapRef.current?.fitToCoordinates(route.geometry, {
      edgePadding: MAP_DEFAULTS.routeFitPadding,
      animated: true,
    });
  }, [overview, route]);

  const leaveOverview = () => {
    setOverview(false);
    setFollowing(true);
  };

  const endTrip = () => {
    stop();
    navigation.navigate('Home');
  };

  const initialRegion = lastPosition
    ? { ...lastPosition.coordinates, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : MAP_DEFAULTS.fallbackRegion;

  return (
    <View style={styles.root}>
      <AvyroMapView
        mapRef={mapRef}
        appearance={preferences.mapStyle}
        showsTraffic={preferences.showTraffic}
        initialRegion={initialRegion}
        pitchEnabled
        onPanDrag={() => setFollowing(false)}
      >
        {routeIndex && progress ? (
          <ActiveRouteOverlay
            routeIndex={routeIndex}
            segmentIndex={progress.segmentIndex}
            snappedPosition={progress.snappedPosition}
          />
        ) : null}

        {destination ? (
          <DestinationMarker
            coordinate={destination.coordinates}
            title={destination.name}
          />
        ) : null}

        {progress ? (
          <UserPuck
            coordinate={progress.snappedPosition}
            headingDegrees={progress.courseDegrees}
          />
        ) : lastPosition ? (
          <UserPuck
            coordinate={lastPosition.coordinates}
            headingDegrees={lastPosition.heading}
          />
        ) : null}
      </AvyroMapView>

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        {status === 'arrived' ? null : progress ? (
          <ManeuverBanner progress={progress} unit={preferences.distanceUnit} />
        ) : (
          <GlassPanel style={styles.acquiring}>
            <AppText variant="subhead" tone="secondary">
              {status === 'rerouting' ? 'Finding a new route…' : 'Waiting for GPS…'}
            </AppText>
          </GlassPanel>
        )}

        {status === 'rerouting' && progress ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.pill}>
            <GlassPanel style={styles.pillInner}>
              <AppText variant="caption" tone="accent">
                Rerouting…
              </AppText>
            </GlassPanel>
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}>
        {status === 'arrived' ? null : (
          <GuidanceControls
            following={following}
            onRecenter={() => setFollowing(true)}
            overview={overview}
            onToggleOverview={() => (overview ? leaveOverview() : setOverview(true))}
            muted={!preferences.voiceGuidance}
            onToggleMute={() =>
              void updatePreferences({ voiceGuidance: !preferences.voiceGuidance })
            }
          />
        )}

        {status === 'arrived' ? (
          <ArrivalCard destination={destination} onDone={endTrip} />
        ) : progress ? (
          <TripStatusBar
            progress={progress}
            unit={preferences.distanceUnit}
            speedMetersPerSecond={lastPosition?.speed ?? null}
            onEnd={endTrip}
          />
        ) : null}
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
    right: spacing.md,
    gap: spacing.xs,
  },
  acquiring: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pill: {
    alignSelf: 'center',
  },
  pillInner: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  bottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    gap: spacing.sm,
  },
});
