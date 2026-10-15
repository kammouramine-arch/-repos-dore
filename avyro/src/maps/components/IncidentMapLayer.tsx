import { t, useUiLanguage } from '@/ui/i18n';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useServices } from '@/app/runtime/AppRuntime';
import { useLocationStore } from '@/app/stores/hooks';
import type { ReviewedIncident } from '@/core/domain/ports/incidentReporter';
import { distanceBetween } from '@/utils/geo';
import { Icon } from '@/ui/components';
import { INCIDENT_CATALOG } from '@/features/incidents/incidentCatalog';

/** Expiring community observations; never presented as verified road facts. */
export function IncidentMapLayer() {
  useUiLanguage();
  const { incidentReporter } = useServices();
  const position = useLocationStore(state => state.position);
  const [reports, setReports] = useState<ReviewedIncident[]>([]);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!active || !incidentReporter.isConfigured() || !incidentReporter.list) return;
    const controller = new AbortController();
    const refresh = () => { void incidentReporter.list!(controller.signal).then(items => { if (!controller.signal.aborted) setReports(items); }).catch(() => { if (!controller.signal.aborted) setReports([]); }); };
    refresh();
    const unsubscribe = incidentReporter.subscribe?.(refresh);
    const timer = setInterval(refresh, 60000);
    return () => { unsubscribe?.(); clearInterval(timer); controller.abort(); };
  }, [active, incidentReporter]);
  if (!active || !position) return null;
  return <>{reports.filter(item => item.expires > now && distanceBetween(position.coordinates, { latitude: item.latitude, longitude: item.longitude }) < 10000).map(item => {
    const category = INCIDENT_CATALOG.find(entry => entry.category === item.category);
    if (!category) return null;
    return <Marker key={item.id} coordinate={{ latitude: item.latitude, longitude: item.longitude }} title={t(category.title)} description={t("Unverified community observation · expires after 1 hour · approximate location")} tracksViewChanges={false}><View style={[styles.marker, { borderColor: category.color }]}><Icon name={category.icon} size={22} color={category.color} /></View></Marker>;
  })}</>;
}
const styles = StyleSheet.create({ marker: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2, borderColor: '#087F83', backgroundColor: '#FFFFFF' } });
