import { t, useUiLanguage } from '@/ui/i18n';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { APP_INFO } from '@/config';
import { AppText, AvyroMark } from '@/ui/components';
import { AvyroRoadster } from '@/maps/components/AvyroRoadster';

export interface SplashOverlayProps { ready: boolean; onFinished: () => void }

/**
 * Timeline, in ms. Short enough that a cold start never feels held hostage:
 * the overlay leaves as soon as the app is ready *and* the mark has landed.
 */
const T = {
  cards: 0, // three cards flick up, one after another, like a feed
  cardsAway: 560, // …and swipe off the top
  road: 520, // a road line draws in under them
  car: 600, // the little car drives across
  mark: 900, // the mark pops in
  cue: 940, // "meep" … "meep" — two notes, two hops of the mark
  minimum: 1500, // earliest the map may be revealed
};

/** Three feature cards: where to, say it, know the limit. Original vector glyphs. */
const CARDS: { tint: string; glyph: 'pin' | 'wave' | 'limit'; tilt: number }[] = [
  { tint: '#2BC2B8', glyph: 'pin', tilt: -7 },
  { tint: '#5DB8FF', glyph: 'wave', tilt: 4 },
  { tint: '#FFB86B', glyph: 'limit', tilt: -2 },
];

const Glyph = ({ kind }: { kind: 'pin' | 'wave' | 'limit' }) => (
  <Svg width={30} height={30} viewBox="0 0 30 30">
    {kind === 'pin' ? (
      <>
        <Path d="M15 27s-8-8.4-8-14a8 8 0 1 1 16 0c0 5.6-8 14-8 14z" fill="#FFFFFF" />
        <Circle cx={15} cy={13} r={3.2} fill="#2BC2B8" />
      </>
    ) : kind === 'wave' ? (
      [6, 10.5, 15, 19.5, 24].map((x, i) => <Rect key={x} x={x - 1.4} y={15 - [4, 8, 11, 7, 4][i]} width={2.8} height={[8, 16, 22, 14, 8][i]} rx={1.4} fill="#FFFFFF" />)
    ) : (
      <>
        <Circle cx={15} cy={15} r={11} fill="#FFFFFF" />
        <Circle cx={15} cy={15} r={11} fill="none" stroke="#E2464F" strokeWidth={3} />
      </>
    )}
  </Svg>
);

const Card = ({ index, progress, away }: { index: number; progress: SharedValue<number>; away: SharedValue<number> }) => {
  const card = CARDS[index];
  const style = useAnimatedStyle(() => {
    // Each card rises in on its own slice of the shared progress.
    const local = Math.max(0, Math.min(1, progress.value * 3 - index * 0.7));
    return {
      opacity: local * (1 - away.value),
      transform: [
        { translateY: (1 - local) * 140 - away.value * (260 + index * 40) },
        { translateX: (index - 1) * 56 * local },
        { rotate: `${card.tilt * local + away.value * (index - 1) * 10}deg` },
        { scale: 0.86 + local * 0.14 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.card, { backgroundColor: card.tint }, style]}>
      <Glyph kind={card.glyph} />
      {card.glyph === 'limit' ? <AppText variant="caption" style={styles.cardLimit}>30</AppText> : null}
    </Animated.View>
  );
};

/**
 * The opening: brand first, then straight to the map.
 *
 * Inspired by the energy of short-video intros — cards that flick up like a
 * feed, a quick hop on the beat — built entirely from meepmeep's own shapes,
 * colours and synthesised two-note cue. No third-party assets.
 *
 * - Plays once per cold launch; returning from the background never replays
 *   it (the overlay is unmounted for the life of the process).
 * - Never holds the app: it leaves when bootstrap is done and the mark has
 *   landed, whichever is later, by opening up onto the live map.
 * - Reduce Motion: a still mark and wordmark, a short cross-fade, no sound.
 */
export const SplashOverlay = ({ ready, onFinished }: SplashOverlayProps) => {
  useUiLanguage();
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(false);

  const cards = useSharedValue(0);
  const away = useSharedValue(0);
  const road = useSharedValue(reduced ? 1 : 0);
  const carX = useSharedValue(-220);
  const mark = useSharedValue(reduced ? 1 : 0);
  const hop = useSharedValue(0);
  const open = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      const timer = setTimeout(() => setElapsed(true), 300);
      return () => clearTimeout(timer);
    }
    cards.value = withDelay(T.cards, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    away.value = withDelay(T.cardsAway, withTiming(1, { duration: 300, easing: Easing.in(Easing.cubic) }));
    road.value = withDelay(T.road, withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }));
    carX.value = withDelay(T.car, withTiming(220, { duration: 720, easing: Easing.inOut(Easing.cubic) }));
    mark.value = withDelay(T.mark, withSpring(1, { damping: 11, stiffness: 180, mass: 0.7 }));
    // Two hops, on the two notes of the cue (0 ms and 150 ms after it starts).
    hop.value = withDelay(T.cue, withSequence(
      withTiming(1, { duration: 70 }), withTiming(0, { duration: 80 }),
      withTiming(1, { duration: 70 }), withTiming(0, { duration: 140 }),
    ));
    const cue = setTimeout(() => {
      void requireOptionalNativeModule<{ playLaunchCue(): Promise<void> }>('AvyroWake')?.playLaunchCue().catch(() => {});
    }, T.cue);
    const timer = setTimeout(() => setElapsed(true), T.minimum);
    return () => { clearTimeout(cue); clearTimeout(timer); };
  }, [reduced, cards, away, road, carX, mark, hop]);

  useEffect(() => {
    if (!ready || !elapsed) return;
    open.value = withTiming(1, { duration: reduced ? 180 : 380, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onFinished)();
    });
  }, [ready, elapsed, reduced, open, onFinished]);

  // Opening onto the map: the whole stage lifts towards the viewer and clears.
  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - open.value,
    transform: [{ scale: 1 + open.value * (reduced ? 0 : 0.12) }],
  }));
  const roadStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: road.value }], opacity: road.value }));
  const carStyle = useAnimatedStyle(() => ({ transform: [{ translateX: carX.value }, { rotate: '90deg' }, { scale: 0.62 }] }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, mark.value * 1.4),
    transform: [{ scale: 0.6 + mark.value * 0.4 + hop.value * 0.06 }, { translateY: -hop.value * 8 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} accessibilityLabel={t('meepmeep is opening')}>
      <View style={styles.stage}>
        {!reduced ? CARDS.map((_, i) => <Card key={i} index={i} progress={cards} away={away} />) : null}
        <Animated.View style={[styles.road, roadStyle]} />
        {!reduced ? <Animated.View style={[styles.car, carStyle]}><AvyroRoadster /></Animated.View> : null}
        <Animated.View style={[styles.identity, markStyle]}>
          <AvyroMark size={96} />
          <AppText variant="title1" style={styles.name}>{APP_INFO.name}</AppText>
          <AppText variant="footnote" style={styles.tagline}>{APP_INFO.tagline}</AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { backgroundColor: '#0D202B', alignItems: 'center', justifyContent: 'center' },
  stage: { width: '100%', height: 340, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  card: {
    position: 'absolute',
    top: 70,
    width: 74,
    height: 96,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  cardLimit: { position: 'absolute', color: '#172B36', fontWeight: '800', fontSize: 12 },
  road: { position: 'absolute', top: 292, width: '78%', height: 2, borderRadius: 1, backgroundColor: '#31505A' },
  car: { position: 'absolute', top: 266 },
  identity: { alignItems: 'center', gap: 10 },
  name: { color: '#F1FFF9', letterSpacing: -1, fontSize: 36 },
  tagline: { color: '#9EB9C1' },
});
