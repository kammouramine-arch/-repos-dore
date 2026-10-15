import { t, useUiLanguage } from '@/ui/i18n';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServices } from '@/app/runtime/AppRuntime';
import { useLocationStore, usePreferencesStore } from '@/app/stores/hooks';
import type { RootStackScreenProps } from '@/app/navigation/types';
import type { Place } from '@/core/domain/entities/place';
import { usePlanDestination } from '@/features/trip/hooks/usePlanDestination';
import { MAP_DEFAULTS } from '@/config';
import { AvyroMapView } from '@/maps/components/AvyroMapView';
import { UserPuck } from '@/maps/components/UserPuck';
import { useDriverHeading } from '@/maps/useDriverHeading';
import { AppText, Button, GlassPanel, Icon, IconButton, ListRow } from '@/ui/components';
import { colors } from '@/ui/theme';
import { distanceBetween } from '@/utils/geo';
import { formatDistance } from '@/utils/format';

const CATEGORIES = { fuel: { title: 'Fuel', query: 'gas station', icon: 'car-outline' }, restaurants: { title: 'Food', query: 'restaurants', icon: 'restaurant-outline' }, parking: { title: 'Parking', query: 'parking', icon: 'car-outline' } } as const;

/** Nearby POIs come from the geocoder, never decorative or invented map pins. */
export const NearbyScreen = () => {
  useUiLanguage();
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'Nearby'>['route']>();
  const category = CATEGORIES[route.params.category];
  const { placesProvider } = useServices();
  const fix = useLocationStore(state => state.position);
  const [origin] = useState(() => fix?.coordinates);
  const prefs = usePreferencesStore(state => state.preferences);
  const heading = useDriverHeading();
  const plan = usePlanDestination();
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const [sheetHeight, setSheetHeight] = useState(390);
  const sheetHeightRef = useRef(390);
  const [places, setPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (!origin) return () => controller.abort();
    void (placesProvider.nearby ? placesProvider.nearby(route.params.category, { near: origin, signal: controller.signal, limit: 25 }) : placesProvider.search(category.query, { near: origin, signal: controller.signal, limit: 25 })).then(found => {
      if (controller.signal.aborted) return;
      const nearby = found.filter(place => distanceBetween(origin, place.coordinates) <= 50000).sort((a, b) => distanceBetween(origin, a.coordinates) - distanceBetween(origin, b.coordinates));
      setPlaces(nearby); setBusy(false);
      if (nearby.length) map.current?.fitToCoordinates([origin, ...nearby.map(p => p.coordinates)], { animated: true, edgePadding: { top: 130, left: 45, right: 45, bottom: sheetHeightRef.current + 30 } });
    }).catch(() => { if (!controller.signal.aborted) { setFailed(true); setBusy(false); } });
    return () => controller.abort();
  }, [category.query, origin, placesProvider, retry, route.params.category]);
  return <View style={styles.root}>
    <AvyroMapView mapRef={map} appearance={prefs.mapStyle} showsTraffic={prefs.showTraffic} initialRegion={origin ? { ...origin, latitudeDelta: .025, longitudeDelta: .025 } : MAP_DEFAULTS.fallbackRegion} legalLabelInsets={{ top: 0, left: 12, right: 0, bottom: sheetHeight + 8 }}>
      {fix ? <UserPuck coordinate={fix.coordinates} headingDegrees={heading} /> : null}
      {places.map((place, index) => <Marker key={place.id} coordinate={place.coordinates} onPress={() => setSelected(place.id)} tracksViewChanges={false} accessibilityLabel={place.name}><View style={[styles.pin, selected === place.id && styles.selectedPin]}><AppText variant="caption" style={{ color: '#FFFFFF' }}>{route.params.category === 'parking' ? 'P' : index + 1}</AppText></View></Marker>)}
    </AvyroMapView>
    <View style={[styles.top, { top: insets.top + 8 }]}><IconButton name="chevron-back" accessibilityLabel={t("Back to map")} onPress={() => navigation.goBack()} /><GlassPanel style={styles.title}><Icon name={category.icon} size={18} color={colors.accent} /><AppText variant="subhead">{category.title} {t("nearby")}</AppText></GlassPanel></View>
    <View style={styles.sheetPosition} onLayout={event => { const height = Math.ceil(event.nativeEvent.layout.height); sheetHeightRef.current = height; setSheetHeight(height); }}><GlassPanel style={{ ...styles.sheet, paddingBottom: Math.max(insets.bottom, 12) }}>
      <View style={styles.grabber} /><AppText variant="title3">{category.title}</AppText>
      <AppText variant="caption" tone="secondary">{placesProvider.supportsTypeahead ? 'Apple Maps' : 'OpenStreetMap contributors'} {t("· straight-line distances")}</AppText>
      {!origin ? <AppText variant="footnote" style={styles.empty}>{t("Enable your location on the map to search nearby.")}</AppText> : busy ? <ActivityIndicator style={{ margin: 24 }} color={colors.accent} /> : failed ? <View style={styles.empty}><AppText variant="footnote">{t("Nearby search unavailable")}</AppText><Button label={t("Try again")} size="medium" onPress={() => { setBusy(true); setFailed(false); setRetry(value => value + 1); }} /></View> : !places.length ? <AppText variant="footnote" style={styles.empty}>{t("No mapped results within 2 km. Try searching by name.")}</AppText> : <FlatList style={{ maxHeight: 235 }} data={selected ? [...places.filter(p => p.id === selected), ...places.filter(p => p.id !== selected)] : places} keyExtractor={p => p.id} renderItem={({ item, index }) => <ListRow testID={`nearby-result-${index}`} title={item.name} subtitle={item.address} icon={category.icon} trailing={origin ? <AppText variant="caption" tone="secondary">{formatDistance(distanceBetween(origin, item.coordinates), prefs.distanceUnit)}</AppText> : undefined} onPress={() => void plan(item, route.params.addStop)} />} />}
    </GlassPanel></View>
  </View>;
};
const styles = StyleSheet.create({
  root: { flex: 1 }, top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetPosition: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 16, gap: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD4DB', marginBottom: 8 },
  pin: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#087F83', borderWidth: 3, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  selectedPin: { backgroundColor: '#183B59' }, empty: { paddingVertical: 18, gap: 12 },
});
