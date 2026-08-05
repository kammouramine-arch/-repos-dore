import { memo } from 'react';
import { Marker } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Coordinates } from '@/core/domain/entities/geo';
import { colors, palette } from '@/ui/theme';

export interface UserPuckProps {
  coordinate: Coordinates;
  /** Course over ground; the cone points where the car is heading. */
  headingDegrees?: number | null;
}

const SIZE = 56;

/**
 * The driver's position.
 *
 * `tracksViewChanges` is off on purpose: leaving it on re-rasterises the marker
 * on every frame and visibly costs frames while the map is moving.
 */
const UserPuckComponent = ({ coordinate, headingDegrees }: UserPuckProps) => (
  <Marker
    coordinate={coordinate}
    anchor={{ x: 0.5, y: 0.5 }}
    flat
    rotation={headingDegrees ?? 0}
    tracksViewChanges={false}
    zIndex={20}
  >
    <Svg width={SIZE} height={SIZE} viewBox="0 0 56 56">
      <Circle cx="28" cy="28" r="26" fill="rgba(61, 123, 255, 0.14)" />
      {headingDegrees == null ? null : (
        <Path d="M28 3 L40 27 A13 13 0 0 0 16 27 Z" fill="rgba(61, 123, 255, 0.42)" />
      )}
      <Circle cx="28" cy="28" r="9.5" fill={colors.accent} />
      <Circle
        cx="28"
        cy="28"
        r="9.5"
        fill="none"
        stroke={palette.white}
        strokeWidth="3.5"
      />
    </Svg>
  </Marker>
);

export const UserPuck = memo(UserPuckComponent);
