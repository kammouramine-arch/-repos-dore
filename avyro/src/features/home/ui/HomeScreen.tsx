import { useDriverHeading } from '@/maps/useDriverHeading';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStores } from '@/app/runtime/AppRuntime';
import {
  useLocationStore,
  usePreferencesStore,
  useTripStore,
} from '@/app/stores/hooks';
import { MAP_DEFAULTS } from '@/config';
import { usePlanDestination } from '@/features/trip/hooks/usePlanDestination';
import { AvyroMapView } from '@/maps/components/AvyroMapView';
import { UserPuck } from '@/maps/components/UserPuck';
import { IncidentReportButton } from '@/features/incidents/ui/IncidentReportButton';
import { IncidentMapLayer } from '@/maps/components/IncidentMapLayer';
import { DrivingStatusPanel } from '@/features/navigation/ui/DrivingStatusPanel';
import { IconButton } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { HomeSheet } from './HomeSheet';
import { HomeHeader } from './HomeHeader';

/**
 * The map is the app. Everything else floats over it, and the camera locks
 * onto the driver exactly once — after that the map is theirs to move.
 */
export const HomeScreen = () => {
  const navigation = useNavigation();
  const driverHeading = useDriverHeading();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [following, setFollowing] = useState(true);
  const [bottomHeight, setBottomHeight] = useState(0);
  const [cameraHeading, setCameraHeading] = useState(0);

  // Narrow selectors on purpose. Home stays mounted under the rest of the
  // stack, so subscribing to whole stores would re-render the map on state it
  // does not display — trip planning, guidance status, sign-in progress.
  const stores = useStores();
  const position = useLocationStore((state) => state.position);
  const locationError = useLocationStore((state) => state.error);
  const locate = useLocationStore((state) => state.locate);
  const recents = useTripStore((state) => state.recents);
  const loadRecents = useTripStore((state) => state.loadRecents);
  const clearRecents = useTripStore((state) => state.clearRecents);
  const preferences = usePreferencesStore((state) => state.preferences);
  const planDestination = usePlanDestination();

  useEffect(() => {
    void locate();
    void loadRecents();
  }, [loadRecents, locate]);

  const centreOnDriver = (animated = true) => {
    setFollowing(true);
    const coordinates = stores.location.getState().position?.coordinates;
    if (!coordinates) {
      void locate();
      return;
    }
    mapRef.current?.animateCamera({ center: coordinates, heading: 0, pitch: 0, altitude: 450, zoom: 17.5 }, { duration: animated ? 650 : 0 });
  };

  // Lock onto the driver once, on the first fix. After that the map is theirs.
  useEffect(() => {
    if (!position || !following || !focused) return;
    mapRef.current?.animateCamera({ center: position.coordinates, heading: 0, pitch: 0, altitude: 450, zoom: 17.5 }, { duration: 850 });
  }, [position, following, focused]);

  return (
    <View style={styles.root}>
      <AvyroMapView
        mapRef={mapRef}
        appearance={preferences.mapStyle}
        showsTraffic={preferences.showTraffic}
        initialRegion={MAP_DEFAULTS.fallbackRegion}
        onMapReady={() => centreOnDriver(false)}
        onPanDrag={() => setFollowing(false)}
        onRegionChangeComplete={() => { if (focused) void mapRef.current?.getCamera().then(camera => setCameraHeading(camera.heading)).catch(() => undefined); }}
        legalLabelInsets={{ top: 0, right: 0, left: spacing.md, bottom: bottomHeight + spacing.xs }}
      >
        {focused ? <IncidentMapLayer /> : null}
        {focused && position ? (
          <UserPuck
            coordinate={position.coordinates}
            headingDegrees={driverHeading}
            cameraHeadingDegrees={cameraHeading}
          />
        ) : null}
      </AvyroMapView>

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        <HomeHeader
          onSettingsPress={() => navigation.navigate('Settings')}
        />
      </View>

      <View onLayout={event => setBottomHeight(Math.round(event.nativeEvent.layout.height))} style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.controls}>
          {focused && position ? <DrivingStatusPanel /> : null}
          <View style={styles.controlButtons}>
          <IncidentReportButton />
          <IconButton
            name="locate"
            accessibilityLabel="Centre on my location"
            onPress={() => centreOnDriver()}
          />
          </View>
        </View>

        <HomeSheet
          recents={recents}
          locationError={locationError}
          onSearchPress={() => navigation.navigate('Search')}
          onRecentPress={(place) => void planDestination(place)}
          onEnableLocation={() => void locate()}
          onClearRecents={() => void clearRecents()}
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
    left: spacing.md,
    right: spacing.md,
    top: 0,
  },
  bottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    gap: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  controlButtons: { gap: spacing.xs, marginLeft: 'auto' },
});
