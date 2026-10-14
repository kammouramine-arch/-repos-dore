import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useServices } from '@/app/runtime/AppRuntime';
import { useLocationStore } from '@/app/stores/hooks';
import type { ReviewedIncident } from '@/core/domain/ports/incidentReporter';
import { distanceBetween } from '@/utils/geo';
import { AppText } from '@/ui/components';

const symbols = { accident: '!', hazard: '△', closure: '⊘', police: '◈', traffic: '≋', 'blocked-lane': '↥', weather: '☂', 'map-issue': '⌖' };

/** Reviewed observations only; a review is not an official verification. */
export function IncidentMapLayer() {
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
    const timer = setInterval(refresh, 60000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [active, incidentReporter]);
  if (!active || !position) return null;
  return <>{reports.filter(item => item.expires > now && distanceBetween(position.coordinates, { latitude: item.latitude, longitude: item.longitude }) < 10000).map(item => <Marker key={item.id} coordinate={{ latitude: item.latitude, longitude: item.longitude }} title={item.category.replace('-', ' ')} description="Reviewed community observation · approximate location · conditions may change" tracksViewChanges={false}><View style={styles.marker}><AppText variant="headline" tone="accent">{symbols[item.category]}</AppText></View></Marker>)}</>;
}
const styles = StyleSheet.create({ marker: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2, borderColor: '#087F83', backgroundColor: '#FFFFFF' } });
