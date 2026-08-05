import type { ReactNode, RefObject } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type MapViewProps } from 'react-native-maps';

import type { MapStyle } from '@/core/domain/entities/preferences';
import { darkMapStyle } from '@/maps/mapStyle';
import { colors } from '@/ui/theme';

export interface AvyroMapViewProps extends MapViewProps {
  mapRef?: RefObject<MapView | null>;
  /** Driver preference: plain cartography or imagery. */
  appearance?: MapStyle;
  children?: ReactNode;
}

/**
 * The only place in the app that touches `react-native-maps` configuration.
 *
 * Android renders Google Maps with Avyro's night style; iOS uses Apple Maps,
 * which honours `userInterfaceStyle` and needs no API key. Platform chrome
 * (compass, toolbar, default location dot) is switched off — Avyro draws its
 * own controls so both platforms look identical.
 */
export const AvyroMapView = ({
  mapRef,
  appearance = 'standard',
  children,
  style,
  ...rest
}: AvyroMapViewProps) => (
  <MapView
    ref={mapRef}
    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
    customMapStyle={appearance === 'standard' ? darkMapStyle : undefined}
    mapType={appearance === 'satellite' ? 'hybrid' : 'standard'}
    userInterfaceStyle="dark"
    showsUserLocation={false}
    showsMyLocationButton={false}
    showsCompass={false}
    toolbarEnabled={false}
    showsPointsOfInterests={false}
    loadingEnabled
    loadingBackgroundColor={colors.background}
    loadingIndicatorColor={colors.accent}
    {...rest}
    style={[StyleSheet.absoluteFill, style]}
  >
    {children}
  </MapView>
);
