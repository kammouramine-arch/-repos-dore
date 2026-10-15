import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useServices, useStores } from '@/app/runtime/AppRuntime';
import { useNavigationStore, usePreferencesStore } from '@/app/stores/hooks';
import type { ReviewedIncident } from '@/core/domain/ports/incidentReporter';
import { locateOnRoute } from '@/core/conversation/detour';
import { reportsNearRoute } from '@/features/incidents/routeReports';
import { INCIDENT_CATALOG } from '@/features/incidents/incidentCatalog';
import type { Route } from '@/core/domain/entities/route';
import { AppText, Button, GlassPanel, ListRow } from '@/ui/components';
import { formatDistance, formatDuration } from '@/utils/format';
import { spacing } from '@/ui/theme';

export const TripDetailsSheet = ({ visible, onClose }: { visible: boolean; onClose(): void }) => {
  const [drag] = useState(() => new Animated.Value(0));
  const scrollOffset = useRef(0);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  // PanResponder stores these callbacks; refs are read only during touch events.
  // eslint-disable-next-line react-hooks/refs
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_event, gesture) => scrollOffset.current <= 1 && gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx) * 1.3,
    onPanResponderMove: (_event, gesture) => drag.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 100 || (gesture.dy > 35 && gesture.vy > .65)) Animated.timing(drag, { toValue: 900, duration: 200, useNativeDriver: true }).start(() => close.current());
      else Animated.spring(drag, { toValue: 0, damping: 24, stiffness: 250, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => { Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(); },
  }), [drag]);
  useEffect(() => { if (visible) { drag.setValue(0); scrollOffset.current = 0; } }, [visible, drag]);
  const navigation = useNavigation();
  const stores = useStores();
  const services = useServices();
  const destination = useNavigationStore(state => state.destination);
  const stops = useNavigationStore(state => state.stops);
  const currentRoute = useNavigationStore(state => state.route);
  const routeIndex = useNavigationStore(state => state.routeIndex);
  const progress = useNavigationStore(state => state.progress);
  const unit = usePreferencesStore(state => state.preferences.distanceUnit);
  const [reports, setReports] = useState<ReviewedIncident[]>([]);
  const [reportStatus, setReportStatus] = useState('Checking community observations…');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const nearReports = useMemo(() => routeIndex ? reportsNearRoute(reports, routeIndex, (progress ? locateOnRoute(routeIndex, progress.snappedPosition)?.travelledMeters ?? 0 : 0), now) : [], [reports, routeIndex, progress, now]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [status, setStatus] = useState(() => stores.location.getState().position ? 'Checking routes…' : 'Waiting for location');
  useEffect(() => {
    if (!visible || !destination) return;
    const origin = stores.location.getState().position?.coordinates;
    if (!origin) return;
    const controller = new AbortController();
    if (services.incidentReporter.list) void services.incidentReporter.list(controller.signal).then(items => {
      if (!controller.signal.aborted) { setReports(items); setReportStatus('Community observations · unverified'); }
    }).catch(() => { if (!controller.signal.aborted) setReportStatus('Community observations unavailable'); });
    void services.useCases.planTrip({ origin, destination, waypoints: stops.map(stop => stop.coordinates), signal: controller.signal }).then(plan => {
      if (!controller.signal.aborted) { setRoutes(plan.routes); setStatus(plan.routes.length > 1 ? 'Routes from your current position' : 'One route returned by the provider'); }
    }).catch(() => { if (!controller.signal.aborted) setStatus('Could not refresh alternatives. Your current route is unchanged.'); });
    return () => controller.abort();
  }, [visible, destination, stops, services, stores]);
  const add = (parking = false) => { onClose(); if (parking) navigation.navigate('Nearby', { category: 'parking', addStop: true }); else navigation.navigate('Search', { addStop: true }); };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss trip details" onPress={onClose} /><Animated.View {...pan.panHandlers} style={{ maxHeight: '85%', transform: [{ translateY: drag }] }}><GlassPanel style={styles.sheet}><ScrollView onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={{ gap: 12 }}>
      <View style={styles.grabber} /><AppText variant="title2">Your trip</AppText>
      {currentRoute?.source === 'TomTom' ? <AppText variant="caption" tone="tertiary">Route © TomTom</AppText> : null}
      <AppText variant="headline">{destination?.name}</AppText><AppText variant="body" tone="secondary">{destination?.address}</AppText>
      {stops.map((stop, index) => <AppText key={stop.id} variant="footnote">Stop {index + 1}: {stop.name} · {stop.address}</AppText>)}
      <View style={styles.actions}><Button label="Add a stop" size="medium" onPress={() => add()} /><Button label="Parking stop" variant="secondary" size="medium" onPress={() => add(true)} /></View>
      <AppText variant="subhead">Available routes</AppText><AppText variant="footnote" tone="secondary">{status}</AppText>
      {routes.map((route, index) => <ListRow key={route.id} title={`${formatDuration(route.durationSeconds)} · ${formatDistance(route.distanceMeters, unit)}`} subtitle={route.summary || `Route ${index + 1}`} icon="navigate-outline" onPress={() => {
        const live = stores.navigation.getState();
        if (live.destination?.id === destination?.id && live.route === currentRoute) live.replaceRoute(route);
        onClose();
      }} />)}
      <AppText variant="subhead">Reports near your route</AppText><AppText variant="caption" tone="secondary">{reportStatus}</AppText>
      {nearReports.length ? nearReports.map(({ report, aheadMeters }) => <AppText key={report.id} variant="footnote">{INCIDENT_CATALOG.find(item => item.category === report.category)?.title} · {formatDistance(aheadMeters, unit)} ahead · unverified</AppText>) : reportStatus === 'Community observations · unverified' ? <AppText variant="footnote" tone="secondary">No active community observations returned near this route.</AppText> : null}
      <AppText variant="footnote" tone="secondary">Community pins are unverified observations. Scheduled departures and a best-time-to-leave prediction are not available yet.</AppText>
      <Button label="Back to navigation" variant="ghost" onPress={onClose} />
    </ScrollView></GlassPanel></Animated.View></View>
  </Modal>;
};
const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,30,38,0.18)' }, sheet: { padding: spacing.lg, paddingBottom: 32, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, grabber: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#75929C', alignSelf: 'center', marginBottom: 6 }, actions: { flexDirection: 'row', gap: 12 } });
