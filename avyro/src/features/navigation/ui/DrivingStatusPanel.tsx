import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Linking, StyleSheet, View } from 'react-native';
import { useStores } from '@/app/runtime/AppRuntime';
import { useLocationStore, usePreferencesStore } from '@/app/stores/hooks';
import { AppText, Icon, PressableScale } from '@/ui/components';
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
  const roadInformation = usePreferencesStore(state => state.preferences.roadInformation);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const road = useRoadInformation(now);
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
  const sign = road?.recentSegmentSigns?.map(s => SIGNS[s.type]).find(Boolean);
  const signal = sign === 'Signal';
  return <View style={styles.root}>
    {sign ? <View style={styles.sign} accessibilityLabel={`Mapped road segment: ${sign}, position ahead unknown`}>{sign === 'STOP' ? <Svg width={28} height={28} viewBox="0 0 28 28"><Path d="M8 1H20L27 8V20L20 27H8L1 20V8Z" fill="#C63843" stroke="#FFFFFF" strokeWidth="2" /><SvgText x="14" y="17" fontSize="8" fontWeight="800" textAnchor="middle" fill="#FFFFFF">STOP</SvgText></Svg> : signal ? <Svg width={18} height={30} viewBox="0 0 18 30"><Rect x="2" y="1" width="14" height="28" rx="5" fill="#273746" />{[7, 15, 23].map(y => <Circle key={y} cx="9" cy={y} r="3" fill="#BBC7CF" />)}</Svg> : <Icon name="warning-outline" size={20} color={colors.textSecondary} />}<View><AppText variant="caption">{sign} · mapped</AppText>{signal ? <AppText variant="caption" tone="secondary" style={{ fontSize: 9 }}>Live light state unavailable</AppText> : null}</View></View> : null}
    <View style={styles.row}>
      <View style={[styles.speed, over && styles.over]} accessibilityLabel={`GPS speed ${formatSpeed(speed, unit) ?? 'unavailable'} ${speedUnitLabel(unit)}`}>
        <AppText variant="title2" style={{ color: over ? '#FF6474' : limit ? '#FFFFFF' : '#B5C1CC', fontVariant: ['tabular-nums'] }}>{formatSpeed(speed, unit) ?? '—'}</AppText>
        <AppText variant="caption" style={{ color: '#DBE4EB', fontSize: 10 }}>{speedUnitLabel(unit)}</AppText>
      </View>
      {limit ? <Animated.View style={[styles.limit, pulseStyle]} accessibilityLabel={`${limit.source === 'municipal-order' ? 'Municipal order' : 'TomTom mapped'} speed limit ${limit.value} ${limit.unit}${over ? ', exceeded' : ''}`}><AppText variant="title3">{limit.value}</AppText><AppText variant="caption" style={{ fontSize: 9 }}>{limit.unit}</AppText></Animated.View> : null}
    </View>
    {!limit ? <AppText variant="caption" tone="secondary" style={styles.warning}>Limit unavailable</AppText> : null}
    {over ? <View style={styles.warning}><AppText variant="caption" tone="danger">Slow down · limit {limit?.value} {limit?.unit}</AppText></View> : null}
    {roadInformation ? <PressableScale accessibilityRole="link" accessibilityLabel="TomTom road data attribution" onPress={() => { void Linking.openURL('https://www.tomtom.com/en-gb/legal/product-attributions/').catch(() => {}); }} style={styles.attribution}><AppText variant="caption" tone="secondary" style={{ fontSize: 10 }}>Road data © TomTom</AppText></PressableScale> : null}
  </View>;
};
const styles = StyleSheet.create({
  root: { gap: 6, alignSelf: 'flex-end', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speed: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#233442', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#102333', shadowOpacity: .16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  over: { borderColor: '#E23E54' },
  limit: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, borderColor: '#D74751', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  sign: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 12, backgroundColor: '#FFFFFF' },
  warning: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  attribution: { backgroundColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
});
