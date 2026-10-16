import { t, useUiLanguage } from '@/ui/i18n';
import { DrivingStatusPanel } from "./DrivingStatusPanel";
import { useNavigation } from "@react-navigation/native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type MapView from "react-native-maps";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useLocationStore,
  useNavigationStore,
  usePreferencesStore,
} from "@/app/stores/hooks";
import { MAP_DEFAULTS } from "@/config";
import { ActiveRouteOverlay } from "@/maps/components/ActiveRouteOverlay";
import { DestinationMarker } from "@/maps/components/DestinationMarker";
import { AvyroMapView } from "@/maps/components/AvyroMapView";
import { FollowPuck } from "@/maps/components/FollowPuck";
import { IncidentMapLayer } from '@/maps/components/IncidentMapLayer';
import { AppText, Button, GlassPanel } from "@/ui/components";
import { spacing } from "@/ui/theme";
import { useGuidanceSession } from "../hooks/useGuidanceSession";
import { ArrivalCard } from "./ArrivalCard";
import { GuidanceControls } from "./GuidanceControls";
import { ManeuverBanner } from "./ManeuverBanner";
import { TripDetailsSheet } from "./TripDetailsSheet";
import { useRoadAhead } from '../hooks/useRoadAhead';
import { RoadAheadMarkers, RoadAheadNotice } from './RoadAheadLayer';
import { TripStatusBar } from "./TripStatusBar";
import { canGuidePosition } from '@/core/navigation/routeTracker';

const KEEP_AWAKE_TAG = "avyro-guidance";

/**
 * Active guidance. The camera rides behind the driver — pitched, rotated to
 * the direction of travel — until they touch the map, at which point control
 * is theirs until they ask for it back.
 */
export const GuidanceScreen = () => {
  useUiLanguage();
  const roadAhead = useRoadAhead();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [following, setFollowing] = useState(true);
  const [bottomHeight, setBottomHeight] = useState(0);
  // The camera's heading matters only once the driver has taken the map: the
  // arrow is then drawn relative to wherever they left it pointing. While
  // following, FollowPuck owns the camera and reading it back would only
  // re-render this screen ten times a second for nothing.
  const [cameraHeading, setCameraHeading] = useState(0);
  const cameraRead = useRef({ pending: false, at: 0 });
  const readCamera = useCallback(() => {
    if (cameraRead.current.pending || Date.now() - cameraRead.current.at < 100) return;
    cameraRead.current = { pending: true, at: Date.now() };
    const map = mapRef.current;
    if (!map) { cameraRead.current.pending = false; return; }
    void map.getCamera().then(camera => setCameraHeading(camera.heading)).catch(() => {}).finally(() => { cameraRead.current.pending = false; });
  }, []);
  // Overview suspends the follow camera and fits the whole route, so a driver
  // stopped at lights can see what is coming without losing their place.
  const [overview, setOverview] = useState(false);
  const [details, setDetails] = useState(false);

  // One selector per slice: the map subtree below re-renders on every fix, and
  // subscribing to the whole store would add every unrelated field to that.
  const status = useNavigationStore((state) => state.status);
  const routeIndex = useNavigationStore((state) => state.routeIndex);
  const stops = useNavigationStore(state => state.stops);
  const destination = useNavigationStore((state) => state.destination);
  const progress = useNavigationStore((state) => state.progress);
  const stop = useNavigationStore((state) => state.stop);
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore((state) => state.update);
  const lastPosition = useLocationStore((state) => state.position);
  const route = useNavigationStore((state) => state.route);
  const navigationHeading = progress && progress.distanceFromRouteMeters <= 25 ? progress.courseDegrees : lastPosition?.speed != null && lastPosition.speed >= 1.5 && lastPosition.heading != null && lastPosition.heading >= 0 ? lastPosition.heading : null;
  const onRoute = !!progress && progress.distanceFromRouteMeters <= 25;
  const puckCoordinate = onRoute ? progress!.snappedPosition : lastPosition?.coordinates ?? progress?.snappedPosition ?? null;
  const followCamera = following && !overview;

  useGuidanceSession();

  useEffect(() => {
    if (!preferences.keepScreenAwake) return;

    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [preferences.keepScreenAwake]);

  // The follow camera lives in FollowPuck, driven by the same per-frame pose
  // as the arrow, so the two can never drift apart.

  // Fitting the route is a one-shot action, not a camera that tracks: the
  // driver asked to see the trip, not to have it recomposed under them.
  useEffect(() => {
    if (!overview || !route) return;
    mapRef.current?.setCamera({ heading: 0, pitch: 0 });

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
    navigation.navigate("Home");
  };

  const initialRegion = lastPosition
    ? { ...lastPosition.coordinates, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : MAP_DEFAULTS.fallbackRegion;

  return (
    <View style={styles.root}>
      <AvyroMapView
        mapRef={mapRef}
        appearance={preferences.mapStyle}
        mapPadding={{ top: insets.top + 160, bottom: insets.bottom + 120, left: spacing.md, right: spacing.md }}
        legalLabelInsets={{ top: 0, right: 0, left: spacing.md, bottom: bottomHeight + spacing.xs }}
        showsTraffic={preferences.showTraffic}
        initialRegion={initialRegion}
        pitchEnabled
        onPanDrag={() => setFollowing(false)}
        onRegionChange={followCamera ? undefined : readCamera}
        onRegionChangeComplete={followCamera ? undefined : readCamera}
      >
        <IncidentMapLayer />
        <RoadAheadMarkers items={roadAhead.items} />
        {routeIndex && progress ? (
          <ActiveRouteOverlay
            routeIndex={routeIndex}
            segmentIndex={progress.segmentIndex}
            snappedPosition={progress.snappedPosition}
          />
        ) : null}

        {stops.map((stop, index) => <DestinationMarker key={stop.id} coordinate={stop.coordinates} title={`Stop ${index + 1}: ${stop.name}`} />)}
        {destination ? (
          <DestinationMarker
            coordinate={destination.coordinates}
            title={destination.name}
          />
        ) : null}

        {puckCoordinate ? (
          <FollowPuck
            mapRef={mapRef}
            coordinate={puckCoordinate}
            headingDegrees={navigationHeading}
            routeGeometry={onRoute ? route?.geometry : undefined}
            segmentIndex={progress?.segmentIndex}
            following={followCamera}
            pitch={preferences.mapPerspective === 'flat' ? 0 : MAP_DEFAULTS.navigationCamera.pitch}
            freeCameraHeading={cameraHeading}
          />
        ) : null}
      </AvyroMapView>

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        {status === "arrived" ? null : progress && status === 'guiding' && canGuidePosition(progress) ? (
          <ManeuverBanner progress={progress} unit={preferences.distanceUnit} />
        ) : (
          <GlassPanel style={styles.acquiring}>
            <AppText variant="subhead" tone="secondary">
              {status === "rerouting" || status === 'off-route'
                ? "Finding a new route…"
                : progress ? "Checking your position…" : "Waiting for GPS…"}
            </AppText>
          </GlassPanel>
        )}

        <RoadAheadNotice items={roadAhead.items} />
        {status === "rerouting" && progress ? (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.pill}
          >
            <GlassPanel style={styles.pillInner}>
              <AppText variant="caption" tone="accent">
                {t("Rerouting…")}</AppText>
            </GlassPanel>
          </Animated.View>
        ) : null}
      </View>

      <View
        onLayout={event => setBottomHeight(Math.round(event.nativeEvent.layout.height))}
        style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}
      >
        {status === "arrived" ? null : (
          <View style={styles.driving}>
            <DrivingStatusPanel />
            <GuidanceControls
              following={following}
              onRecenter={() => setFollowing(true)}
              overview={overview}
              onToggleOverview={() =>
                overview ? leaveOverview() : setOverview(true)
              }
              muted={!preferences.voiceGuidance}
              onToggleMute={() =>
                void updatePreferences({
                  voiceGuidance: !preferences.voiceGuidance,
                })
              }
            />
          </View>
        )}

        {status === "arrived" ? (
          <ArrivalCard destination={destination} onDone={endTrip} />
        ) : progress ? (
          <TripStatusBar
            progress={progress}
            unit={preferences.distanceUnit}
            onEnd={endTrip}
            onDetails={() => setDetails(true)}
            destinationName={destination?.name}
          />
        ) : <GlassPanel style={styles.waiting}><AppText variant="footnote" tone="secondary" style={{ flexShrink: 1 }}>{t("Waiting for an accurate GPS fix")}</AppText><Button label={t("End")} variant="danger" size="medium" onPress={endTrip} /></GlassPanel>}
      </View>
      <TripDetailsSheet visible={details} onClose={() => setDetails(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  waiting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  driving: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  root: {
    flex: 1,
  },
  top: {
    position: "absolute",
    top: 0,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.xs,
  },
  acquiring: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  pill: {
    alignSelf: "center",
  },
  pillInner: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  bottom: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    gap: spacing.sm,
  },
});
