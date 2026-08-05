import { formatInstruction, roadNameOf } from './instructionFormatter';
import { toManeuverType } from './maneuverMapper';
import type { OsrmStep } from './osrmTypes';

const step = (
  maneuver: OsrmStep['maneuver'],
  name?: string,
  ref?: string,
): OsrmStep => ({ distance: 100, duration: 20, name, ref, maneuver });

describe('formatInstruction', () => {
  it('describes the departure by compass direction', () => {
    expect(
      formatInstruction(
        step({ location: [2.3, 48.8], type: 'depart', bearing_after: 92 }, 'Rue de Rivoli'),
      ),
    ).toBe('Head east on Rue de Rivoli');
  });

  it('names the road being turned onto', () => {
    expect(
      formatInstruction(
        step({ location: [2.3, 48.8], type: 'turn', modifier: 'right' }, 'Rue Saint-Denis'),
      ),
    ).toBe('Turn right onto Rue Saint-Denis');
  });

  it('counts roundabout exits', () => {
    expect(
      formatInstruction(
        step({ location: [2.3, 48.8], type: 'roundabout', exit: 3 }, 'Avenue Foch'),
      ),
    ).toBe('At the roundabout, take the third exit onto Avenue Foch');
  });

  it('handles arrival on either side', () => {
    expect(
      formatInstruction(step({ location: [2.3, 48.8], type: 'arrive', modifier: 'left' })),
    ).toBe('Arrive — destination on your left');
  });

  it('falls back to a safe instruction for an unknown maneuver', () => {
    expect(formatInstruction(step({ location: [2.3, 48.8], type: 'notification' }))).toBe(
      'Continue straight',
    );
  });
});

describe('roadNameOf', () => {
  it('prefers the name, then the route number', () => {
    expect(roadNameOf(step({ location: [2.3, 48.8] }, 'Rue de Rivoli', 'D5'))).toBe(
      'Rue de Rivoli',
    );
    expect(roadNameOf(step({ location: [2.3, 48.8] }, '  ', 'A6'))).toBe('A6');
    expect(roadNameOf(step({ location: [2.3, 48.8] }))).toBeUndefined();
  });
});

describe('toManeuverType', () => {
  it('maps the type first, then the modifier', () => {
    expect(toManeuverType({ location: [0, 0], type: 'rotary' })).toBe('roundabout');
    expect(toManeuverType({ location: [0, 0], type: 'on ramp' })).toBe('ramp');
    expect(toManeuverType({ location: [0, 0], type: 'turn', modifier: 'sharp left' })).toBe(
      'sharp-left',
    );
  });

  it('degrades to going straight when nothing matches', () => {
    expect(toManeuverType({ location: [0, 0], type: 'something new' })).toBe('straight');
  });
});
