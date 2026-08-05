import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, gradients } from '@/ui/theme';

export interface AvyroMarkProps {
  size?: number;
  /** Thin orbit ring — used at large sizes, dropped in compact placements. */
  ring?: boolean;
}

/**
 * Avyro's mark: a heading arrow, cut from the brand gradient, with one facet
 * catching the light. Vector so it stays crisp from a 20 pt header to a
 * full-screen splash.
 */
export const AvyroMark = ({ size = 72, ring = true }: AvyroMarkProps) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Defs>
      <LinearGradient id="avyroMarkFill" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={gradients.brand[0]} />
        <Stop offset="1" stopColor={gradients.brand[1]} />
      </LinearGradient>
    </Defs>

    {ring ? (
      <Circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke={colors.borderStrong}
        strokeWidth="1.25"
      />
    ) : null}

    <Path d="M32 10 L52.5 50 32 39.5 11.5 50 Z" fill="url(#avyroMarkFill)" />
    <Path d="M32 10 L52.5 50 32 39.5 Z" fill="rgba(255,255,255,0.22)" />
  </Svg>
);
