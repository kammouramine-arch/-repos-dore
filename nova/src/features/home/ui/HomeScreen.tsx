import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStores } from '@/app/runtime/AppRuntime';
import {
  useAuthStore,
  useLocationStore,
  usePreferencesStore,
  useTripStore,
} from '@/app/stores/hooks';
import { MAP_DEFAULTS } from '@/config';
import { usePlanDestination } from '@/features/trip/hooks/usePlanDestination';
import { regionAround } from '@/maps/camera';
import { NovaMapView } from '@/maps/components/NovaMapView';
import { UserPuck } from '@/maps/components/UserPuck';
import { IconButton } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { HomeSheet } from './HomeSheet';
import { HomeTopBar } from './HomeTopBar';

/**
 * The map is the app. Everything else floats over it, and the camera locks
 * onto the driver exactly once — after that the map is theirs to move.
 */
export const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const hasCentred = useRef(false);

  // Narrow selectors on purpose. Home stays mounted under the rest of the
  // stack, so subscribing to whole stores would re-render the map on state it
  // does not display — trip planning, guidance status, sign-in progress.
  const stores = useStores();
  const session = useAuthStore((state) => state.session);
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
    const coordinates = stores.location.getState().position?.coordinates;
    if (!coordinates) {
      void locate();
      return;
    }
    mapRef.current?.animateToRegion(regionAround(coordinates), animated ? 650 : 0);
  };

  // Lock onto the driver once, on the first fix. After that the map is theirs.
  useEffect(() => {
    if (!position || hasCentred.current) return;
    hasCentred.current = true;
    mapRef.current?.animateToRegion(regionAround(position.coordinates), 650);
  }, [position]);

  return (
    <View style={styles.root}>
      <NovaMapView
        mapRef={mapRef}
        appearance={preferences.mapStyle}
        showsTraffic={preferences.showTraffic}
        initialRegion={MAP_DEFAULTS.fallbackRegion}
      >
        {position ? (
          <UserPuck
            coordinate={position.coordinates}
            headingDegrees={position.heading}
          />
        ) : null}
      </NovaMapView>

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        <HomeTopBar
          fullName={session?.user.fullName ?? 'Driver'}
          onSettingsPress={() => navigation.navigate('Settings')}
        />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.controls}>
          <IconButton
            name="locate"
            accessibilityLabel="Centre on my location"
            onPress={() => centreOnDriver()}
          />
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
    alignItems: 'flex-end',
  },
});
