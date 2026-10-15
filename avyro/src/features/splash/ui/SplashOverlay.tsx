import { t, useUiLanguage } from '@/ui/i18n';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { APP_INFO } from '@/config';
import { AppText, AvyroMark } from '@/ui/components';
import { AvyroRoadster } from '@/maps/components/AvyroRoadster';

export interface SplashOverlayProps { ready: boolean; onFinished: () => void }
/** Live vector entrance; map bootstraps underneath. Re-entry never replays this. */
export const SplashOverlay = ({ ready, onFinished }: SplashOverlayProps) => {
  useUiLanguage();
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(false);
  const carX = useSharedValue(reduced ? 0 : -180);
  const reveal = useSharedValue(reduced ? 1 : 0);
  const fade = useSharedValue(1);
  useEffect(() => {
    carX.value = withTiming(100, { duration: reduced ? 0 : 650 });
    reveal.value = withDelay(reduced ? 0 : 280, withTiming(1, { duration: 240 }));
    const timer = setTimeout(() => setElapsed(true), reduced ? 0 : 800);
    const cue = setTimeout(() => { if (!reduced) void requireOptionalNativeModule<{ playLaunchCue(): Promise<void> }>('AvyroWake')?.playLaunchCue().catch(() => {}); }, 300);
    return () => { clearTimeout(timer); clearTimeout(cue); };
  }, [carX, reveal, reduced]);
  useEffect(() => {
    if (ready && elapsed) fade.value = withTiming(0, { duration: reduced ? 0 : 230 }, finished => { if (finished) runOnJS(onFinished)(); });
  }, [ready, elapsed, reduced, fade, onFinished]);
  const opacity = useAnimatedStyle(() => ({ opacity: fade.value }));
  const car = useAnimatedStyle(() => ({ opacity: 1 - reveal.value * .65, transform: [{ translateX: carX.value }, { rotate: '90deg' }] }));
  const mark = useAnimatedStyle(() => ({ opacity: reveal.value, transform: [{ translateY: (1 - reveal.value) * 12 }] }));
  return <Animated.View style={[StyleSheet.absoluteFill, styles.root, opacity]} accessibilityLabel={t("meepmeep is opening")}>
    <View style={styles.stage}>
      <View style={styles.road} />
      {!reduced ? <Animated.View style={[styles.car, car]}><AvyroRoadster /></Animated.View> : null}
      <Animated.View style={[styles.identity, mark]}>
        <AvyroMark size={100} />
        <AppText variant="title1" style={styles.name}>{APP_INFO.name}</AppText>
        <AppText variant="footnote" style={styles.tagline}>{APP_INFO.tagline}</AppText>
      </Animated.View>
    </View>
  </Animated.View>;
};
const styles = StyleSheet.create({
  root: { backgroundColor: '#0D202B', alignItems: 'center', justifyContent: 'center' },
  stage: { width: '100%', height: 280, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  road: { position: 'absolute', top: 236, width: '100%', height: 1, backgroundColor: '#31505A' },
  car: { position: 'absolute', top: 214 },
  identity: { alignItems: 'center', gap: 10 },
  name: { color: '#F1FFF9', letterSpacing: -1, fontSize: 36 },
  tagline: { color: '#9EB9C1' },
});
