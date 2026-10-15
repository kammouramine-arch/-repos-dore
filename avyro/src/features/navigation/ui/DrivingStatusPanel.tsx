import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStores } from '@/app/runtime/AppRuntime';
import { useLocationStore, usePreferencesStore } from '@/app/stores/hooks';
import { AppText, Icon } from '@/ui/components';
import { haptics } from '@/ui/feedback/haptics';
import { colors } from '@/ui/theme';
import { formatSpeed, speedUnitLabel } from '@/utils/format';
import { useRoadInformation } from '../hooks/useRoadInformation';
import { aboveMappedLimit, measuredSpeed } from '@/core/navigation/measuredSpeed';
const SIGNS: Record<string, string> = { StopSign: 'STOP', YieldSign: 'Yield', TrafficLightSign: 'Signal', TrafficLightsSign: 'Signal', SchoolZoneSign: 'School', PedestrianCrossingSign: 'Crossing' };
/** Compact separate instruments: measured speed and sourced legal-limit evidence. */
export const DrivingStatusPanel = () => {
  const stores = useStores();
  const fix = useLocationStore(state => state.position);
  const unit = usePreferencesStore(state => state.preferences.distanceUnit);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const road = useRoadInformation(now);
  const speed = measuredSpeed(fix, now);
  const limit = road?.speedLimit;
  const over = aboveMappedLimit(speed, limit);
  const wasOver = useRef(false);
  const lastWarning = useRef(0);
  useEffect(() => {
    if (over && !wasOver.current && now - lastWarning.current > 30000) {
      haptics.emphasis(); lastWarning.current = now;
      const prefs = stores.preferences.getState().preferences;
      if (prefs.voiceGuidance && limit) {
        const french = prefs.voiceLanguage === 'fr-FR' || (prefs.voiceLanguage === 'bilingual' && Intl.DateTimeFormat().resolvedOptions().locale.startsWith('fr'));
        stores.conversation.getState().dispatch({ type: 'navigation-announcement', language: french ? 'fr-FR' : 'en-US', text: french ? `Ralentissez. La carte indique une limitation à ${limit.value} ${limit.unit}.` : `Slow down. The mapped limit is ${limit.value} ${limit.unit}.` });
      }
    }
    wasOver.current = over;
  }, [over, now, limit, stores]);
  const sign = road?.recentSegmentSigns?.map(s => SIGNS[s.type]).find(Boolean);
  return <View style={styles.root}>
    {sign ? <View style={styles.sign} accessibilityLabel={`Mapped road segment: ${sign}, position ahead unknown`}><Icon name="warning-outline" size={14} color={colors.textSecondary} /><AppText variant="caption">{sign} · mapped</AppText></View> : null}
    <View style={styles.row}>
      <View style={[styles.speed, over && styles.over]} accessibilityLabel={`GPS speed ${formatSpeed(speed, unit) ?? 'unavailable'} ${speedUnitLabel(unit)}`}>
        <AppText variant="title2" style={{ color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>{formatSpeed(speed, unit) ?? '—'}</AppText>
        <AppText variant="caption" style={{ color: '#DBE4EB', fontSize: 10 }}>{speedUnitLabel(unit)}</AppText>
      </View>
      {limit ? <View style={styles.limit} accessibilityLabel={`TomTom mapped speed limit ${limit.value} ${limit.unit}`}><AppText variant="title3">{limit.value}</AppText><AppText variant="caption" style={{ fontSize: 9 }}>{limit.unit}</AppText></View> : null}
    </View>
    {over ? <View style={styles.warning}><AppText variant="caption" tone="danger">Slow down · mapped limit {limit?.value} {limit?.unit}</AppText></View> : null}
  </View>;
};
const styles = StyleSheet.create({
  root: { gap: 6, alignSelf: 'flex-end', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speed: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#233442', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#102333', shadowOpacity: .16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  over: { backgroundColor: '#BE3246' },
  limit: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, borderColor: '#D74751', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  sign: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 12, backgroundColor: '#FFFFFF' },
  warning: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
});
