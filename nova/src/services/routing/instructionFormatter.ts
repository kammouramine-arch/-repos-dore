import type { OsrmManeuver, OsrmStep } from './osrmTypes';

/**
 * OSRM returns maneuver *data*, not sentences — building the wording is the
 * client's job. Keeping it here means the banner and the spoken guidance always
 * agree, and adding a language later is a change to one file.
 */

const COMPASS = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
];

const ORDINALS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
];

const TURNS: Record<string, string> = {
  uturn: 'Make a U-turn',
  'sharp right': 'Turn sharp right',
  right: 'Turn right',
  'slight right': 'Bear right',
  straight: 'Continue straight',
  'slight left': 'Bear left',
  left: 'Turn left',
  'sharp left': 'Turn sharp left',
};

const compassOf = (bearing = 0): string =>
  COMPASS[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];

const ordinalOf = (exit: number): string => ORDINALS[exit - 1] ?? `${exit}th`;

const onto = (roadName?: string): string => (roadName ? ` onto ${roadName}` : '');

/** Best label for the road a step follows: its name, or its route number. */
export const roadNameOf = (step: OsrmStep): string | undefined => {
  const name = step.name?.trim();
  if (name) return name;
  return step.ref?.trim() || undefined;
};

const forTurn = (maneuver: OsrmManeuver, roadName?: string): string => {
  const turn = TURNS[maneuver.modifier ?? 'straight'] ?? 'Continue';
  return `${turn}${turn === 'Continue straight' ? '' : onto(roadName)}`;
};

/** Driver-facing sentence for a single OSRM step. */
export const formatInstruction = (step: OsrmStep): string => {
  const maneuver = step.maneuver;
  const roadName = roadNameOf(step);

  switch (maneuver.type) {
    case 'depart':
      return `Head ${compassOf(maneuver.bearing_after)}${roadName ? ` on ${roadName}` : ''}`;

    case 'arrive':
      if (maneuver.modifier === 'left') return 'Arrive — destination on your left';
      if (maneuver.modifier === 'right') return 'Arrive — destination on your right';
      return 'Arrive at your destination';

    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return maneuver.exit
        ? `At the roundabout, take the ${ordinalOf(maneuver.exit)} exit${onto(roadName)}`
        : `Take the roundabout${onto(roadName)}`;

    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${onto(roadName)}`;

    case 'merge':
      return `Merge${onto(roadName)}`;

    case 'on ramp':
      return `Take the ramp${onto(roadName)}`;

    case 'off ramp':
      return `Take the exit${onto(roadName)}`;

    case 'fork':
      return maneuver.modifier?.includes('left')
        ? `Keep left at the fork${onto(roadName)}`
        : `Keep right at the fork${onto(roadName)}`;

    case 'new name':
      return `Continue${onto(roadName)}`;

    case 'continue':
      return roadName ? `Continue on ${roadName}` : 'Continue straight';

    default:
      return forTurn(maneuver, roadName);
  }
};
