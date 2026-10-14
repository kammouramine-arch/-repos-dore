import { Alert, Modal, StyleSheet, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useServices, useStores } from '@/app/runtime/AppRuntime';
import { canReportIncident } from '@/core/navigation/reportEligibility';
import type { IncidentCategory } from '@/core/domain/ports/incidentReporter';
import { AppText, Button, GlassPanel, Icon, IconButton, PressableScale } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';
import { INCIDENT_CATALOG as categories } from '../incidentCatalog';
export const IncidentReportButton = () => {
  const { incidentReporter } = useServices();
  const stores = useStores();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = useCallback(async (category: IncidentCategory) => {
    if (busy) return;
    setBusy(true);
    try {
      let fix = stores.location.getState().position;
      if (!canReportIncident(fix, Date.now())) {
        await stores.location.getState().locate();
        fix = stores.location.getState().position;
      }
      if (!fix || !canReportIncident(fix, Date.now())) { Alert.alert('Location needed', 'Avyro cannot place this report yet. Enable precise location or try with a clearer GPS signal.'); return; }
      await incidentReporter.submit(category, fix);
      setVisible(false);
      Alert.alert('Report received', 'Your observation was sent for review.');
    } catch { Alert.alert('Report not sent', 'Check your connection and try again.'); }
    finally { setBusy(false); }
  }, [busy, incidentReporter, stores]);
  return <><IconButton name="flag" style={{ backgroundColor: '#FFE18B', borderColor: '#F0CC6B' }} accessibilityLabel="Report an incident" onPress={() => {
    if (!incidentReporter.isConfigured()) { Alert.alert('Reports unavailable', 'Please try again later.'); return; }
    setVisible(true);
  }} />
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) setVisible(false); }}>
      <View style={styles.backdrop}><GlassPanel style={styles.sheet}>
        <View style={styles.grabber} />
        <AppText variant="title2">What did you see?</AppText>
        <AppText variant="footnote" tone="secondary">Choose an observation to share its category and approximate location for review.</AppText>
        <View style={styles.grid}>{categories.map(item => <PressableScale key={item.category} disabled={busy} style={styles.tile} accessibilityRole="button" accessibilityLabel={`Report ${item.title}`} onPress={() => void submit(item.category)}><View style={[styles.icon, { backgroundColor: item.color + '18' }]}><Icon name={item.icon} color={item.color} size={27} /></View><AppText variant="caption">{item.title}</AppText></PressableScale>)}</View>
        {busy ? <AppText variant="footnote" tone="accent">Sending observation…</AppText> : null}
        <Button label="Close" variant="ghost" disabled={busy} onPress={() => setVisible(false)} />
      </GlassPanel></View>
    </Modal></>;
};
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: spacing.sm, paddingBottom: spacing.xl, backgroundColor: colors.scrim },
  sheet: { padding: spacing.md, gap: spacing.sm },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CCD5DC', alignSelf: 'center', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '30%', paddingVertical: 12, alignItems: 'center', gap: 8 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
