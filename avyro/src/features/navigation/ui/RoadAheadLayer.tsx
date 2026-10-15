import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useStores } from '@/app/runtime/AppRuntime';
import type { RoadAlert } from '@/core/domain/ports/roadDataProvider';
import { AppText, GlassPanel, Icon } from '@/ui/components';
import type { useRoadAhead } from '../hooks/useRoadAhead';

type Ahead = ReturnType<typeof useRoadAhead>['items'];
const labels: Record<RoadAlert['kind'], [string, string]> = {
  stop: ['Stop sign', 'Panneau stop'], yield: ['Give way', 'Cédez le passage'],
  'traffic-light': ['Traffic light', 'Feu de circulation'],
  'traffic-light-warning': ['Traffic-light warning sign', 'Panneau annonçant des feux'],
  'limited-access': ['Limited-access road', 'Voie à accès réglementé'],
  ramp: ['Slip road', 'Bretelle'], 'numbered-road': ['Route', 'Route'],
};
function SignIcon({ kind }: { kind: RoadAlert['kind'] }) {
  if (kind === 'stop') return <Svg width={30} height={30} viewBox="0 0 28 28"><Path d="M8 1H20L27 8V20L20 27H8L1 20V8Z" fill="#C63843" stroke="#FFFFFF" strokeWidth="2" /><SvgText x="14" y="17" fontSize="8" fontWeight="800" textAnchor="middle" fill="#FFFFFF">STOP</SvgText></Svg>;
  if (kind === 'traffic-light' || kind === 'traffic-light-warning') return <Svg width={20} height={30} viewBox="0 0 18 30"><Rect x="2" y="1" width="14" height="28" rx="5" fill="#273746" />{['#EE6B72', '#EBC65D', '#71C5AA'].map((fill, i) => <Circle key={fill} cx="9" cy={7 + i * 8} r="3" fill={fill} />)}</Svg>;
  if (kind === 'yield') return <Svg width={30} height={30} viewBox="0 0 30 30"><Path d="M3 4H27L15 27Z" fill="#FFFFFF" stroke="#C63843" strokeWidth="4" strokeLinejoin="round" /></Svg>;
  if (kind === 'limited-access') return <Svg width={30} height={30} viewBox="0 0 30 30"><Rect x="1" y="1" width="28" height="28" rx="5" fill="#176B79" /><Path d="M7 26L12 5M23 26L18 5M5 14H25M15 23V19M15 11V7" stroke="#FFFFFF" strokeWidth="2.5" /></Svg>;
  return <Icon name={kind === 'ramp' ? 'git-merge-outline' : 'map-outline'} size={25} color="#167D83" />;
}
export function RoadAheadMarkers({ items }: { items: Ahead }) {
  return <>{items.slice(0, 20).map(({ alert }) => <Marker key={alert.id} coordinate={alert.coordinate} title={`${labels[alert.kind][0]} · mapped`} description="TomTom map data · follow posted signs · live light colour unavailable" tracksViewChanges={Platform.OS === 'ios'} zIndex={12}><Animated.View entering={ZoomIn.duration(220)} style={styles.pin}><SignIcon kind={alert.kind} /></Animated.View></Marker>)}</>;
}
export function RoadAheadNotice({ items }: { items: Ahead }) {
  const stores = useStores();
  const spoken = useRef(new Set<string>());
  const next = items[0];
  useEffect(() => {
    if (!next || next.aheadMeters > (['stop','yield','traffic-light','traffic-light-warning'].includes(next.alert.kind) ? 150 : 250) || spoken.current.has(next.alert.id)) return;
    const prefs = stores.preferences.getState().preferences;
    if (!prefs.voiceGuidance) return;
    spoken.current.add(next.alert.id);
    if (spoken.current.size > 100) spoken.current.delete(spoken.current.values().next().value!);
    const french = prefs.voiceLanguage === 'fr-FR' || (prefs.voiceLanguage === 'bilingual' && Intl.DateTimeFormat().resolvedOptions().locale.startsWith('fr'));
    const distance = Math.max(10, Math.round(next.aheadMeters / 10) * 10);
    const name = `${labels[next.alert.kind][french ? 1 : 0]}${next.alert.label ? ' ' + next.alert.label : ''}`;
    stores.conversation.getState().dispatch({ type: 'navigation-announcement', language: french ? 'fr-FR' : 'en-US', text: french ? `${name} indiqué sur la carte dans ${distance} mètres.` : `${name} mapped ${distance} meters ahead.` });
  }, [next, stores]);
  if (!next || next.aheadMeters > 400) return null;
  return <Animated.View key={next.alert.id} entering={FadeInDown.duration(200)}><GlassPanel style={styles.notice}><SignIcon kind={next.alert.kind} /><View style={{ flex: 1 }}><AppText variant="subhead">{labels[next.alert.kind][0]}{next.alert.label ? ` ${next.alert.label}` : ''}</AppText><AppText variant="caption" tone="secondary" accessibilityLabel={`${Math.round(next.aheadMeters)} meters ahead, mapped location, current light colour unknown`}>{Math.max(10, Math.round(next.aheadMeters / 10) * 10)} m ahead</AppText></View></GlassPanel></Animated.View>;
}
const styles = StyleSheet.create({ pin: { padding: 5, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE5E9' }, notice: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 } });
