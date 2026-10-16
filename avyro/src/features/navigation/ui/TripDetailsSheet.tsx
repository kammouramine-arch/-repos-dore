import { t, useUiLanguage } from '@/ui/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
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
  const reduced = useReducedMotion();
  const afterDismiss = useRef<(() => void) | undefined>(undefined);
  const dismiss = useCallback((after?: () => void) => {
    afterDismiss.current = after;
    haptics.selection();
    onClose();
    // UIKit owns the iOS sheet transition. Navigate only once it has finished.
    if (Platform.OS !== 'ios') { afterDismiss.current = undefined; after?.(); }
  }, [onClose]);
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
  useEffect(() => { if (!visible) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [visible]);
  const nearReports = useMemo(() => routeIndex ? reportsNearRoute(reports, routeIndex, (progress ? locateOnRoute(routeIndex, progress.snappedPosition)?.travelledMeters ?? 0 : 0), now) : [], [reports, routeIndex, progress, now]);
  const routeContext = JSON.stringify([destination?.id, ...stops.map(stop => stop.id)]);
  const [alternatives, setAlternatives] = useState<{ context: string; routes: Route[]; status: string } | null>(null);
  const didDismiss = useCallback(() => {
    const action = afterDismiss.current;
    afterDismiss.current = undefined;
    setAlternatives(null);
    setReports([]);
    setReportStatus('Checking community observations…');
    action?.();
  }, []);
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
  return <Modal visible={visible} presentationStyle="pageSheet" allowSwipeDismissal animationType={reduced ? 'none' : 'slide'} backdropColor="transparent" onDismiss={didDismiss} onRequestClose={() => dismiss()}>
    <GlassPanel style={styles.sheet}>
      <View testID="trip-sheet-drag-handle" style={styles.dragHeader}><View style={styles.grabber} /><AppText variant="title2">{t("Your trip")}</AppText></View>
      <ScrollView bounces alwaysBounceVertical contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
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
    </ScrollView></GlassPanel>
  </Modal>;
};
const styles = StyleSheet.create({ sheet: { flex: 1, padding: spacing.lg, paddingBottom: 32, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, dragHeader: { paddingBottom: 16, minHeight: 64 }, grabber: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#75929C', alignSelf: 'center', marginBottom: 6 }, actions: { flexDirection: 'row', gap: 12 } });
