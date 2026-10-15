import { t, useUiLanguage } from '@/ui/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { haptics } from '@/ui/feedback/haptics';
import { useReducedMotion } from 'react-native-reanimated';

export const TripDetailsSheet = ({ visible, onClose }: { visible: boolean; onClose(): void }) => {
  useUiLanguage();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [drag] = useState(() => new Animated.Value(height));
  const [shade] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const scrollOffset = useRef(0);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  const dismiss = useCallback((after?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(drag, { toValue: height, duration: reduced ? 0 : 230, useNativeDriver: true }),
      Animated.timing(shade, { toValue: 0, duration: reduced ? 0 : 230, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) { close.current(); after?.(); } });
  }, [drag, shade, height, reduced]);
  const reveal = useCallback(() => {
    if (reduced) { drag.setValue(0); shade.setValue(1); return; }
    Animated.parallel([
      Animated.spring(drag, { toValue: 0, damping: 30, stiffness: 290, mass: 1, overshootClamping: true, useNativeDriver: true }),
      Animated.timing(shade, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [drag, shade, reduced]);
  // PanResponder stores these callbacks; refs are read only during touch events.
  // eslint-disable-next-line react-hooks/refs
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_event, gesture) => scrollOffset.current <= 1 && gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx) * 1.3,
    onPanResponderMove: (_event, gesture) => drag.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 100 || (gesture.dy > 35 && gesture.vy > .65)) { haptics.selection(); dismiss(); }
      else Animated.spring(drag, { toValue: 0, damping: 24, stiffness: 250, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => { Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(); },
  }), [drag, dismiss]);
  useEffect(() => { if (visible) { closing.current = false; drag.setValue(height); shade.setValue(0); scrollOffset.current = 0; } }, [visible, drag, shade, height]);
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
  const routeContext = JSON.stringify([destination?.id, ...stops.map(stop => stop.id)]);
  const [alternatives, setAlternatives] = useState<{ context: string; routes: Route[]; status: string } | null>(null);
  const routes = alternatives?.context === routeContext ? alternatives.routes : [];
  const status = alternatives?.context === routeContext ? alternatives.status : stores.location.getState().position ? 'Checking routes…' : 'Waiting for location';
  useEffect(() => {
    if (!visible || !destination) return;
    const origin = stores.location.getState().position?.coordinates;
    if (!origin) return;
    const controller = new AbortController();
    if (services.incidentReporter.list) void services.incidentReporter.list(controller.signal).then(items => {
      if (!controller.signal.aborted) { setReports(items); setReportStatus('Community observations · unverified'); }
    }).catch(() => { if (!controller.signal.aborted) setReportStatus('Community observations unavailable'); });
    void services.useCases.planTrip({ origin, destination, waypoints: stops.map(stop => stop.coordinates), signal: controller.signal }).then(plan => {
      if (!controller.signal.aborted) setAlternatives({ context: routeContext, routes: plan.routes, status: plan.routes.length > 1 ? 'Routes from your current position' : 'One route returned by the provider' });
    }).catch(() => { if (!controller.signal.aborted) setAlternatives({ context: routeContext, routes: [], status: 'Could not refresh alternatives. Your current route is unchanged.' }); });
    return () => controller.abort();
  }, [visible, destination, stops, services, stores, routeContext]);
  const [feedbackBusy, setFeedbackBusy] = useState<string | null>(null);
  const giveFeedback = async (id: string, decision: 'confirmed' | 'not-seen') => {
    const fix = stores.location.getState().position;
    if (!fix || !services.incidentReporter.feedback || feedbackBusy) return;
    setFeedbackBusy(id);
    try {
      await services.incidentReporter.feedback(id, decision, fix);
      setReportStatus('Observation received · reports remain unverified');
    } catch { Alert.alert('Observation not sent', 'A fresh GPS position within 150 metres is required. Please try again nearby.'); }
    finally { setFeedbackBusy(null); }
  };
  const add = (parking = false) => dismiss(() => { if (parking) navigation.navigate('Nearby', { category: 'parking', addStop: true }); else navigation.navigate('Search', { addStop: true }); });
  return <Modal visible={visible} transparent animationType="none" onShow={reveal} onRequestClose={() => dismiss()}>
    <View style={styles.backdrop}><Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,30,38,0.10)', opacity: shade }]} /><Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t("Dismiss trip details")} onPress={() => { haptics.selection(); dismiss(); }} /><Animated.View {...pan.panHandlers} style={{ height: '82%', transform: [{ translateY: drag }] }}><GlassPanel style={styles.sheet}><ScrollView onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={{ gap: 12 }}>
      <View style={styles.grabber} /><AppText variant="title2">{t("Your trip")}</AppText>
      {currentRoute?.source === 'TomTom' ? <AppText variant="caption" tone="tertiary">{t("Route © TomTom")}</AppText> : null}
      <AppText variant="headline">{destination?.name}</AppText><AppText variant="body" tone="secondary">{destination?.address}</AppText>
      {stops.map((stop, index) => <AppText key={stop.id} variant="footnote">{t("Stop")} {index + 1}: {stop.name} · {stop.address}</AppText>)}
      <View style={styles.actions}><Button label={t("Add a stop")} size="medium" onPress={() => add()} /><Button label={t("Parking stop")} variant="secondary" size="medium" onPress={() => add(true)} /></View>
      <AppText variant="subhead">{t("Available routes")}</AppText><AppText variant="footnote" tone="secondary">{t(status)}</AppText>
      {routes.map((route, index) => <ListRow key={route.id} title={`${formatDuration(route.durationSeconds)} · ${formatDistance(route.distanceMeters, unit)}`} subtitle={route.summary || `Route ${index + 1}`} icon="navigate-outline" onPress={() => {
        const live = stores.navigation.getState();
        if (live.destination?.id === destination?.id && live.route === currentRoute) live.replaceRoute(route);
        dismiss();
      }} />)}
      <AppText variant="subhead">{t("Reports near your route")}</AppText><AppText variant="caption" tone="secondary">{t(reportStatus)}</AppText>
      {nearReports.length ? nearReports.map(({ report, aheadMeters }) => <View key={report.id} style={{ gap: 8 }}><AppText variant="footnote">{INCIDENT_CATALOG.find(item => item.category === report.category)?.title} · {formatDistance(aheadMeters, unit)} {t("ahead · unverified")}</AppText><View style={styles.actions}><Button label={t("Still there")} size="medium" disabled={!!feedbackBusy} onPress={() => void giveFeedback(report.id, 'confirmed')} /><Button label={t("Not seen")} size="medium" variant="secondary" disabled={!!feedbackBusy} onPress={() => void giveFeedback(report.id, 'not-seen')} /></View></View>) : reportStatus === 'Community observations · unverified' ? <AppText variant="footnote" tone="secondary">{t("No active community observations returned near this route.")}</AppText> : null}
      <AppText variant="footnote" tone="secondary">{t("Community pins are unverified observations. Scheduled departures and a best-time-to-leave prediction are not available yet.")}</AppText>
      <Button label={t("Back to navigation")} variant="ghost" onPress={() => dismiss()} />
    </ScrollView></GlassPanel></Animated.View></View>
  </Modal>;
};
const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'flex-end' }, sheet: { flex: 1, padding: spacing.lg, paddingBottom: 32, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, grabber: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#75929C', alignSelf: 'center', marginBottom: 6 }, actions: { flexDirection: 'row', gap: 12 } });
