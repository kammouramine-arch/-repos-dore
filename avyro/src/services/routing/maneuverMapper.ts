import type { ManeuverType } from '@/core/domain/entities/route';
import type { OsrmManeuver } from './osrmTypes';

const BY_MODIFIER: Record<string, ManeuverType> = {
  uturn: 'uturn',
  'sharp right': 'sharp-right',
  right: 'turn-right',
  'slight right': 'slight-right',
  straight: 'straight',
  'slight left': 'slight-left',
  left: 'turn-left',
  'sharp left': 'sharp-left',
};

const BY_TYPE: Record<string, ManeuverType> = {
  depart: 'depart',
  arrive: 'arrive',
  merge: 'merge',
  fork: 'fork',
  'on ramp': 'ramp',
  'off ramp': 'ramp',
  roundabout: 'roundabout',
  rotary: 'roundabout',
  'roundabout turn': 'roundabout',
  'exit roundabout': 'roundabout',
  'exit rotary': 'roundabout',
};

/**
 * Collapses OSRM's `type` × `modifier` matrix into Avyro's maneuver vocabulary.
 * Anything unrecognised becomes `straight`, which is the safe default: the
 * driver still hears the road name and sees the distance.
 */
export const toManeuverType = ({ type, modifier }: OsrmManeuver): ManeuverType => {
  const byType = type ? BY_TYPE[type] : undefined;
  if (byType) return byType;

  return (modifier ? BY_MODIFIER[modifier] : undefined) ?? 'straight';
};
