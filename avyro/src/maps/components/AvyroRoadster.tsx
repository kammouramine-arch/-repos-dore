import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

/** Original top-down car, with a clear front, windshield and rear lamps. */
export const AvyroRoadster = () => {
  return <Svg width={36} height={44} viewBox="0 0 64 76">
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
  <Path d="M24 29 Q32 26 40 29 L41 48 Q32 52 23 48Z" fill="#35A6A3" stroke="#B7EEEC" strokeWidth="1.5" />
  <Path d="M24 51 Q32 55 40 51 L39 55 Q32 58 25 55Z" fill="#B7EEEC" />
  <Path d="M22 57 Q32 61 42 57 M24 64 L28 64 M36 64 L40 64" stroke="#A8E9DF" strokeWidth="2" fill="none" strokeLinecap="round" />
  <Rect x="19" y="59" width="5" height="3" rx="1.5" fill="#FFB9B1" /><Rect x="40" y="59" width="5" height="3" rx="1.5" fill="#FFB9B1" />
</Svg>;
};
