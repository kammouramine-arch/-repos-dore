import { useEffect, useRef } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { initialLevelEnvelope, stepLevelEnvelope } from '@/core/conversation/levelEnvelope';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Phase = 'listening' | 'thinking' | 'speaking';

/**
 * Palettes per phase, per appearance. Original to meepmeep: mint→teal→sky
 * while listening, indigo→violet while working, amber→coral while talking.
 * Light mode uses deeper, more opaque tones so the edge holds against a
 * bright map; dark mode uses luminous ones at lower opacity.
 */
const PALETTE: Record<Phase, { dark: [string, string, string]; light: [string, string, string] }> = {
  listening: { dark: ['#5CF2CF', '#2BC2B8', '#5DB8FF'], light: ['#0FB896', '#0A8F8A', '#2F86D6'] },
  thinking: { dark: ['#8F9BFF', '#B48CFF', '#6FC3FF'], light: ['#4E5BD9', '#7A4FD6', '#2F86D6'] },
  speaking: { dark: ['#FFD27A', '#FF9F7A', '#FFC3A0'], light: ['#E0A21B', '#E26A45', '#D9893C'] },
};

/**
 * The screen edge says what meepmeep is doing.
 *
 * - **Listening** — driven by the live microphone through a gated envelope
 *   (levelEnvelope.ts): the rim thickens and brightens as you speak and settles
 *   in silence or steady road noise. No synthetic motion stands in for audio.
 * - **Thinking** — two soft highlights travel round the rim; nothing here is
 *   tied to audio, and it does not pretend to be.
 * - **Speaking** — a slow, warm breathing glow. The speech engine exposes no
 *   output level, so this is a rhythm, not a meter.
 *
 * With Reduce Motion on, every phase is a still rim whose colour alone says
 * the state. Never intercepts touches.
 */
export function VoiceFrame({ active, state, level }: { active: boolean; state: string; level: number }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const dark = useColorScheme() === 'dark';
  const phase: Phase = state === 'thinking' ? 'thinking' : state === 'speaking' || state === 'navigation-interrupt' || state === 'resuming' ? 'speaking' : 'listening';

  const energy = useSharedValue(0);
  const breath = useSharedValue(0);
  const orbit = useSharedValue(0);
  const envelope = useRef({ state: initialLevelEnvelope, at: 0 });

  // Microphone → envelope → a short tween to the next value (updates are ~8 Hz).
  useEffect(() => {
    if (!active || phase !== 'listening') {
      envelope.current = { state: initialLevelEnvelope, at: 0 };
      energy.value = withTiming(0, { duration: 200 });
      return;
    }
    const now = Date.now();
    const dt = envelope.current.at ? now - envelope.current.at : 125;
    envelope.current = { state: stepLevelEnvelope(envelope.current.state, level, dt), at: now };
    energy.value = reduced ? 0 : withTiming(envelope.current.state.value, { duration: 120, easing: Easing.out(Easing.quad) });
  }, [active, phase, level, reduced, energy]);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(orbit);
    breath.value = 0;
    orbit.value = 0;
    if (!active || reduced) return;
    if (phase === 'speaking') {
      breath.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1);
    } else if (phase === 'thinking') {
      orbit.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1);
    }
    return () => { cancelAnimation(breath); cancelAnimation(orbit); };
  }, [active, phase, reduced, breath, orbit]);

  const perimeter = 2 * (width + height - 12);
  const rimProps = useAnimatedProps(() => ({
    strokeWidth: 3 + energy.value * 7 + breath.value * 2.5,
  }));
  const haloProps = useAnimatedProps(() => ({
    strokeWidth: 10 + energy.value * 22 + breath.value * 8,
    opacity: (dark ? 0.14 : 0.2) + energy.value * 0.35 + breath.value * 0.12,
  }));
  const cometProps = useAnimatedProps(() => ({
    strokeDashoffset: -orbit.value * perimeter,
  }));

  if (!active) return null;
  const [a, b, c] = PALETTE[phase][dark ? 'dark' : 'light'];
  const rx = 44;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="mm-edge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="0.5" stopColor={b} />
            <Stop offset="1" stopColor={c} />
          </LinearGradient>
        </Defs>
        <AnimatedRect x={6} y={6} width={width - 12} height={height - 12} rx={rx} fill="none" stroke="url(#mm-edge)" animatedProps={haloProps} />
        <AnimatedRect x={3} y={3} width={width - 6} height={height - 6} rx={rx} fill="none" stroke="url(#mm-edge)" animatedProps={rimProps} />
        {phase === 'thinking' && !reduced ? (
          <AnimatedRect
            x={3}
            y={3}
            width={width - 6}
            height={height - 6}
            rx={rx}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={dark ? 0.7 : 0.85}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={[perimeter * 0.08, perimeter * 0.42]}
            animatedProps={cometProps}
          />
        ) : null}
      </Svg>
    </Animated.View>
  );
}
