import { isRoadEvidenceCurrent } from './roadEvidence';
import type { RoadEvidence } from '@/core/domain/ports/roadDataProvider';
const now = 100000;
const position = { coordinates: { latitude: 48, longitude: 2 }, accuracy: 10, speed: 10, heading: 0, timestamp: now };
const evidence: RoadEvidence = { source: 'TomTom map data', position, capturedAt: now, expiresAt: now + 5000, speedLimit: { value: 50, unit: 'km/h' } };
test('road evidence clears as the car moves, GPS weakens or data expires', () => {
  expect(isRoadEvidenceCurrent(evidence, position, now)).toBe(true);
  expect(isRoadEvidenceCurrent(evidence, { ...position, coordinates: { latitude: 48.001, longitude: 2 } }, now)).toBe(false);
  expect(isRoadEvidenceCurrent(evidence, { ...position, accuracy: 80 }, now)).toBe(false);
  expect(isRoadEvidenceCurrent(evidence, { ...position, accuracy: null }, now)).toBe(false);
  expect(isRoadEvidenceCurrent(evidence, { ...position, timestamp: now + 1 }, now)).toBe(false);
  expect(isRoadEvidenceCurrent(evidence, { ...position, timestamp: now + 5001 }, now + 5001)).toBe(false);
  expect(isRoadEvidenceCurrent(null, position, now)).toBe(false);
});

test('a turn invalidates the previous road limit before its age timer expires', () => {
  expect(isRoadEvidenceCurrent(evidence, { ...position, heading: 90 }, now)).toBe(false);
  expect(isRoadEvidenceCurrent({ ...evidence, position: { ...position, heading: 350 } }, { ...position, heading: 10 }, now)).toBe(true);
});

describe('evidence anchored to the matched road element', () => {
  // Invented street: due north from (48, 2) for ~400 m.
  const north = (m: number) => ({ latitude: 48 + m / 111_195, longitude: 2 });
  const segment = { geometry: [north(-50), north(0), north(400)] };
  const anchored: RoadEvidence = { ...evidence, segment, speedLimit: { value: 30, unit: 'km/h' } };
  const at = (m: number, t: number, extra: Partial<typeof position> = {}) => ({ ...position, coordinates: north(m), timestamp: t, ...extra });

  it('keeps a known limit steadily along the whole element', () => {
    // 30 km/h ≈ 8.3 m/s. Every second for 40 s: never blanks.
    for (let s = 0; s <= 40; s += 1) {
      expect(isRoadEvidenceCurrent(anchored, at(s * 8.3, now + s * 1000), now + s * 1000)).toBe(true);
    }
  });

  it('clears as soon as the car runs off the end of the element', () => {
    expect(isRoadEvidenceCurrent(anchored, at(430, now + 50_000), now + 50_000)).toBe(false);
  });

  it('clears when the car turns off it', () => {
    expect(isRoadEvidenceCurrent(anchored, at(100, now + 5000, { heading: 90 }), now + 5000)).toBe(false);
  });

  it('clears on a parallel road more than 12 m away', () => {
    const parallel = { ...at(100, now + 5000), coordinates: { latitude: north(100).latitude, longitude: 2 + 20 / 74_500 } };
    expect(isRoadEvidenceCurrent(anchored, parallel, now + 5000)).toBe(false);
  });

  it('does not apply to the opposite direction of travel', () => {
    expect(isRoadEvidenceCurrent(anchored, at(100, now + 5000, { heading: 180 }), now + 5000)).toBe(false);
  });

  it('clears when the fix degrades', () => {
    expect(isRoadEvidenceCurrent(anchored, at(100, now + 5000, { accuracy: 40 }), now + 5000)).toBe(false);
  });

  it('is re-confirmed after two minutes even on a very long element', () => {
    expect(isRoadEvidenceCurrent(anchored, at(100, now + 121_000, { speed: 0 }), now + 121_000)).toBe(false);
  });

  it('ignores geometry that stops where the car was matched (no evidence ahead)', () => {
    // If the provider returned only the traversed part, nothing is known about
    // the road ahead: fall back to the short point lifetime.
    const clipped: RoadEvidence = { ...anchored, segment: { geometry: [north(-50), north(0)] } };
    expect(isRoadEvidenceCurrent(clipped, at(0, now), now)).toBe(true); // point rule, same spot
    expect(isRoadEvidenceCurrent(clipped, at(60, now + 3000), now + 3000)).toBe(false);
  });
});
