import { useEffect } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import Animated, { cancelAnimation, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const AnimatedEyes = Animated.createAnimatedComponent(G);

/** Original top-down open roadster: a seated little companion, never an arrow. */
export const AvyroRoadster = () => {
  const reduced = useReducedMotion();
  const blink = useSharedValue(1);
  useEffect(() => {
    blink.value = reduced ? 1 : withRepeat(withDelay(4500, withSequence(withTiming(0, { duration: 80 }), withTiming(1, { duration: 140 }))), -1, false);
    return () => cancelAnimation(blink);
  }, [blink, reduced]);
  const eyes = useAnimatedProps(() => ({ opacity: blink.value }));
  return <Svg width={56} height={66} viewBox="0 0 64 76">
  <Ellipse cx="32" cy="40" rx="28" ry="34" fill="rgba(8,127,131,0.12)" />
  <Ellipse cx="32" cy="43" rx="20" ry="29" fill="rgba(12,42,53,0.18)" />
  <Rect x="9" y="20" width="8" height="14" rx="3" fill="#183441" />
  <Rect x="47" y="20" width="8" height="14" rx="3" fill="#183441" />
  <Rect x="9" y="49" width="8" height="14" rx="3" fill="#183441" />
  <Rect x="47" y="49" width="8" height="14" rx="3" fill="#183441" />
  <Path d="M17 15 Q19 7 32 7 Q45 7 47 15 L49 57 Q49 67 41 69 L23 69 Q15 67 15 57Z" fill="#087F83" stroke="#FFFFFF" strokeWidth="2.5" />
  <Path d="M20 17 Q32 12 44 17 L43 23 Q32 20 21 23Z" fill="#B7EEEC" />
  <Path d="M22 12 L25 11 M39 11 L42 12" stroke="#FFF3CD" strokeWidth="3" strokeLinecap="round" />
  <Rect x="20" y="27" width="24" height="29" rx="8" fill="#183D49" />
  <Rect x="24" y="37" width="16" height="15" rx="6" fill="#CDE9DF" />
  <Path d="M25 44 L39 44" stroke="#8ABEB2" strokeWidth="2" />
  <Path d="M22 39 Q21 33 27 31 L36 31 Q43 33 42 39" fill="#F2C49B" />
  <Circle cx="32" cy="29" r="8" fill="#F2C49B" />
  <Path d="M24 29 Q22 18 32 19 Q42 19 40 29 L37 25 Q31 28 26 24Z" fill="#223F4B" />
  <AnimatedEyes animatedProps={eyes}><Circle cx="29" cy="29" r="1" fill="#183441" /><Circle cx="35" cy="29" r="1" fill="#183441" /></AnimatedEyes>
  <Path d="M30 33 Q32 34 34 33" stroke="#A8634B" strokeWidth="1.3" fill="none" strokeLinecap="round" />
  <Path d="M22 57 Q32 61 42 57 M24 64 L28 64 M36 64 L40 64" stroke="#A8E9DF" strokeWidth="2" fill="none" strokeLinecap="round" />
  <Rect x="19" y="59" width="5" height="3" rx="1.5" fill="#FFB9B1" /><Rect x="40" y="59" width="5" height="3" rx="1.5" fill="#FFB9B1" />
</Svg>;
};
