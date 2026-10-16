import { useColorScheme } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * The driver's position: a small, original navigation arrow.
 *
 * Replaces the cartoon car (AvyroRoadster), which at map scale read as a toy
 * and hid how precisely the position is known. An arrow says only what the
 * app knows: a point and a direction. A faceted head gives it depth without
 * detail; the soft accuracy halo keeps it findable at a glance; the white
 * rim holds contrast on light and dark map styles alike, like a road marking.
 *
 * Drawn pointing up; the caller rotates it.
 */
export const NAVIGATION_ARROW_SIZE = 34;

export const NavigationArrow = ({ size = NAVIGATION_ARROW_SIZE }: { size?: number }) => {
  const dark = useColorScheme() === 'dark';
  const body = dark ? '#3EE0B5' : '#0A8F8A';
  const shade = dark ? '#1FA584' : '#06615E';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="mm-arrow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={body} />
          <Stop offset="1" stopColor={shade} />
        </LinearGradient>
      </Defs>
      <Circle cx="20" cy="20" r="18" fill={body} opacity={dark ? 0.18 : 0.14} />
      <Circle cx="20" cy="20" r="12.5" fill={dark ? '#0D202B' : '#FFFFFF'} opacity={0.92} />
      {/* Arrow: tip at the top, notched tail; the right facet is darker for depth. */}
      <Path d="M20 9 L28.5 28.5 L20 24 L11.5 28.5 Z" fill="url(#mm-arrow)" />
      <Path d="M20 9 L28.5 28.5 L20 24 Z" fill={shade} opacity={0.6} />
      <Path d="M20 9 L28.5 28.5 L20 24 L11.5 28.5 Z" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
};
