import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useServices, useStores } from '@/app/runtime/AppRuntime';
import { useNavigationStore, usePreferencesStore } from '@/app/stores/hooks';
import type { Route } from '@/core/domain/entities/route';
import { AppText, Button, GlassPanel, ListRow } from '@/ui/components';
import { formatDistance, formatDuration } from '@/utils/format';
import { spacing, colors } from '@/ui/theme';

export const TripDetailsSheet = ({ visible, onClose }: { visible: boolean; onClose(): void }) => {
  const navigation = useNavigation();
  const stores = useStores();
  const services = useServices();
  const destination = useNavigationStore(state => state.destination);
  const stops = useNavigationStore(state => state.stops);
  const currentRoute = useNavigationStore(state => state.route);
  const unit = usePreferencesStore(state => state.preferences.distanceUnit);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [status, setStatus] = useState(() => stores.location.getState().position ? 'Checking routes…' : 'Waiting for location');
  useEffect(() => {
    if (!visible || !destination) return;
    const origin = stores.location.getState().position?.coordinates;
    if (!origin) return;
    const controller = new AbortController();
    void services.useCases.planTrip({ origin, destination, waypoints: stops.map(stop => stop.coordinates), signal: controller.signal }).then(plan => {
      if (!controller.signal.aborted) { setRoutes(plan.routes); setStatus(plan.routes.length > 1 ? 'Routes from your current position' : 'One route returned by the provider'); }
    }).catch(() => { if (!controller.signal.aborted) setStatus('Could not refresh alternatives. Your current route is unchanged.'); });
    return () => controller.abort();
  }, [visible, destination, stops, services, stores]);
  const add = (parking = false) => { onClose(); if (parking) navigation.navigate('Nearby', { category: 'parking', addStop: true }); else navigation.navigate('Search', { addStop: true }); };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><GlassPanel style={styles.sheet}><ScrollView contentContainerStyle={{ gap: 12 }}>
      <View style={styles.grabber} /><AppText variant="title2">Your trip</AppText>
      <AppText variant="headline">{destination?.name}</AppText><AppText variant="body" tone="secondary">{destination?.address}</AppText>
      {stops.map((stop, index) => <AppText key={stop.id} variant="footnote">Stop {index + 1}: {stop.name} · {stop.address}</AppText>)}
      <View style={styles.actions}><Button label="Add a stop" size="medium" onPress={() => add()} /><Button label="Parking stop" variant="secondary" size="medium" onPress={() => add(true)} /></View>
      <AppText variant="subhead">Available routes</AppText><AppText variant="footnote" tone="secondary">{status}</AppText>
      {routes.map((route, index) => <ListRow key={route.id} title={`${formatDuration(route.durationSeconds)} · ${formatDistance(route.distanceMeters, unit)}`} subtitle={route.summary || `Route ${index + 1}`} icon="navigate-outline" onPress={() => {
        const live = stores.navigation.getState();
        if (live.destination?.id === destination?.id && live.route === currentRoute) live.replaceRoute(route);
        onClose();
      }} />)}
      <AppText variant="footnote" tone="secondary">Community pins are unverified observations. Scheduled departures and a best-time-to-leave prediction are not available yet.</AppText>
      <Button label="Back to navigation" variant="ghost" onPress={onClose} />
    </ScrollView></GlassPanel></View>
  </Modal>;
};
const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }, sheet: { maxHeight: '85%', padding: spacing.lg, paddingBottom: 32, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD4DB', alignSelf: 'center', marginBottom: 6 }, actions: { flexDirection: 'row', gap: 12 } });
