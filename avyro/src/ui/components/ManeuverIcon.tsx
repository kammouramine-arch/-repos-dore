import Svg, { Circle, G, Path } from 'react-native-svg';

import type { ManeuverType } from '@/core/domain/entities/route';
import { colors } from '@/ui/theme';
import { glyphFor } from './maneuverGlyphs';

export interface ManeuverIconProps {
  maneuver: ManeuverType;
  size?: number;
  color?: string;
}

export const ManeuverIcon = ({
  maneuver,
  size = 34,
  color = colors.textPrimary,
}: ManeuverIconProps) => {
  const { glyph, mirrored } = glyphFor(maneuver);
  const stroke = { stroke: color, strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform={mirrored ? 'translate(24, 0) scale(-1, 1)' : undefined}>
        {glyph.paths.map((path) => (
          <Path key={path} d={path} fill="none" {...stroke} />
        ))}
        {glyph.circles?.map((circle) => (
          <Circle
            key={`${circle.cx}-${circle.cy}-${circle.r}`}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill={circle.filled ? color : 'none'}
            {...(circle.filled ? {} : stroke)}
          />
        ))}
      </G>
    </Svg>
  );
};
