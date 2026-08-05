import { Marker } from 'react-native-maps';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { Coordinates } from '@/core/domain/entities/geo';
import { gradients, palette } from '@/ui/theme';

export interface DestinationMarkerProps {
  coordinate: Coordinates;
  title?: string;
}

/** The destination pin, drawn from the brand gradient. */
export const DestinationMarker = ({ coordinate, title }: DestinationMarkerProps) => (
  <Marker
    coordinate={coordinate}
    title={title}
    anchor={{ x: 0.5, y: 1 }}
    tracksViewChanges={false}
    zIndex={15}
  >
    <Svg width={40} height={52} viewBox="0 0 40 52">
      <Defs>
        <LinearGradient id="novaPinFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gradients.brand[0]} />
          <Stop offset="1" stopColor={gradients.brand[1]} />
        </LinearGradient>
      </Defs>

      <Path
        d="M20 2C10.6 2 3 9.5 3 18.8 3 31.4 20 50 20 50s17-18.6 17-31.2C37 9.5 29.4 2 20 2z"
        fill="url(#novaPinFill)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
      />
      <Circle cx="20" cy="18.5" r="6.2" fill={palette.white} />
    </Svg>
  </Marker>
);
