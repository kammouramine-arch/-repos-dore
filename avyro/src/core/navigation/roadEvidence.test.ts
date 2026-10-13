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
