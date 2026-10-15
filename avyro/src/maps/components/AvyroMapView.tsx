import type { ReactNode, RefObject } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type MapViewProps } from 'react-native-maps';

import type { MapStyle } from '@/core/domain/entities/preferences';
import { darkMapStyle } from '@/maps/mapStyle';
import { spacing } from '@/ui/theme';

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
  legalLabelInsets,
  appleLogoInsets,
  ...rest
}: AvyroMapViewProps) => {
  const dark = useColorScheme() === 'dark';
  return (
  <MapView
    ref={mapRef}
    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
    customMapStyle={Platform.OS === 'android' && appearance === 'standard' ? darkMapStyle : undefined}
    mapType={appearance === 'satellite' ? 'hybrid' : 'standard'}
    showsBuildings
    userInterfaceStyle={dark ? 'dark' : 'light'}
    showsUserLocation={false}
    showsMyLocationButton={false}
    showsCompass={false}
    toolbarEnabled={false}
    showsPointsOfInterests={false}
    loadingEnabled
    loadingBackgroundColor={dark ? '#0D202B' : '#F4F6F8'}
    loadingIndicatorColor={dark ? '#67EDC1' : '#087F83'}
    {...rest}
    legalLabelInsets={legalLabelInsets}
    appleLogoInsets={appleLogoInsets ?? (legalLabelInsets ? { top: 0, left: 0, right: spacing.md, bottom: legalLabelInsets.bottom } : undefined)}
    style={[StyleSheet.absoluteFill, style]}
  >
    {children}
  </MapView>
);
};
