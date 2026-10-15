import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useStores } from '@/app/runtime/AppRuntime';
import { useLocationStore, useNavigationStore, usePreferencesStore } from '@/app/stores/hooks';
import { AppText, PressableScale } from '@/ui/components';
import { haptics } from '@/ui/feedback/haptics';
import { formatSpeed, speedUnitLabel } from '@/utils/format';
import { useRoadInformation } from '../hooks/useRoadInformation';
import { aboveMappedLimit, measuredSpeed } from '@/core/navigation/measuredSpeed';
import type { RoadEvidence } from '@/core/domain/ports/roadDataProvider';
/** Compact separate instruments: measured speed and sourced legal-limit evidence. */
export const DrivingStatusPanel = ({ routeEvidence }: { routeEvidence?: RoadEvidence | null }) => {
  const stores = useStores();
  const fix = useLocationStore(state => state.position);
  const unit = usePreferencesStore(state => state.preferences.distanceUnit);
  const roadInformation = usePreferencesStore(state => state.preferences.roadInformation);
  const tomtomRoute = useNavigationStore(state => state.route?.source === 'TomTom');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const road = useRoadInformation(now, routeEvidence);
  const speed = measuredSpeed(fix, now);
  const limit = road?.speedLimit;
  const over = aboveMappedLimit(speed, limit);
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = over ? withRepeat(withSequence(withTiming(1, { duration: 550 }), withTiming(0, { duration: 550 })), -1) : 0;
    return () => { cancelAnimation(pulse); };
  }, [over, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * .1 }], opacity: 1 - pulse.value * .25 }));
  const wasOver = useRef(false);
  const lastWarning = useRef(0);
  useEffect(() => {
    if (over && !wasOver.current && now - lastWarning.current > 30000) {
      haptics.emphasis(); lastWarning.current = now;
      const prefs = stores.preferences.getState().preferences;
      if (prefs.voiceGuidance && limit) {
        const french = prefs.voiceLanguage === 'fr-FR' || (prefs.voiceLanguage === 'bilingual' && Intl.DateTimeFormat().resolvedOptions().locale.startsWith('fr'));
        stores.conversation.getState().dispatch({ type: 'navigation-announcement', language: french ? 'fr-FR' : 'en-US', text: french ? `Ralentissez. La limitation indiquée est de ${limit.value} ${limit.unit === 'km/h' ? 'kilomètres par heure' : 'miles par heure'}.` : `Slow down. The mapped limit is ${limit.value} ${limit.unit === 'km/h' ? 'kilometers per hour' : 'miles per hour'}.` });
      }
    }
    wasOver.current = over;
  }, [over, now, limit, stores]);
  return <View style={styles.root}>
    <View style={styles.row}>
      <View style={[styles.speed, over && styles.over]} accessibilityLabel={`GPS speed ${formatSpeed(speed, unit) ?? 'unavailable'} ${speedUnitLabel(unit)}`}>
        <AppText testID="gps-speed-value" variant="title2" style={{ color: over ? '#FF6474' : '#FFFFFF', fontVariant: ['tabular-nums'] }}>{formatSpeed(speed, unit) ?? '—'}</AppText>
        <AppText variant="caption" style={{ color: '#DBE4EB', fontSize: 10 }}>{speedUnitLabel(unit)}</AppText>
      </View>
      {limit ? <Animated.View style={[styles.limit, pulseStyle]} accessibilityLabel={`${limit.source === 'municipal-order' ? 'Municipal order' : 'TomTom mapped'} speed limit ${limit.value} ${limit.unit}${over ? ', exceeded' : ''}`}><AppText variant="title3">{limit.value}</AppText><AppText variant="caption" style={{ fontSize: 9 }}>{limit.unit}</AppText></Animated.View> : null}
    </View>
    {over ? <View style={styles.warning}><AppText variant="caption" tone="danger">Slow down · limit {limit?.value} {limit?.unit}</AppText></View> : null}
    {roadInformation || tomtomRoute ? <PressableScale accessibilityRole="link" accessibilityLabel={`TomTom road data attribution${limit ? '' : ', speed limit unavailable'}`} onPress={() => { void Linking.openURL('https://www.tomtom.com/en-gb/legal/product-attributions/').catch(() => {}); }} style={styles.attribution}><AppText variant="caption" tone="secondary" style={{ fontSize: 9 }}>© TomTom</AppText></PressableScale> : null}
  </View>;
};
const styles = StyleSheet.create({
  root: { gap: 6, alignSelf: 'flex-end', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speed: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#233442', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#102333', shadowOpacity: .16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  over: { borderColor: '#E23E54' },
  limit: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, borderColor: '#D74751', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  warning: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  attribution: { backgroundColor: 'rgba(231,242,243,0.72)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
});
