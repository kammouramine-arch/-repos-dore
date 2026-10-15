import { sectionRoadEvidence } from './sectionRoadEvidence';
import type { RoadAheadEvidence } from '@/core/domain/ports/roadDataProvider';
const fix = { coordinates: { latitude: 50, longitude: 3.001 }, speed: 10, heading: 90, timestamp: 10000, accuracy: 5 };
const section = { geometry: [{ latitude: 50, longitude: 3 }, { latitude: 50, longitude: 3.002 }], speedLimit: { value: 30, unit: 'km/h' as const } };
const evidence: RoadAheadEvidence = { source: 'TomTom map data', alerts: [], segments: [section], expiresAt: 300000 };
test('a sourced road section stays available between network calls while GPS matches it', () => {
  expect(sectionRoadEvidence(evidence, fix, 10000)?.speedLimit?.value).toBe(30);
  expect(sectionRoadEvidence(evidence, { ...fix, timestamp: 22000 }, 22000)?.speedLimit?.value).toBe(30);
});
test('a turn, different road, ambiguous limit, endpoint, stale GPS or expired source clears it', () => {
  for (const moved of [{ ...fix, heading: 180 }, { ...fix, accuracy: 60 }, { ...fix, coordinates: { latitude: 50.001, longitude: 3.001 } }, { ...fix, coordinates: section.geometry[1] }]) expect(sectionRoadEvidence(evidence, moved, 10000)).toBeNull();
  expect(sectionRoadEvidence(evidence, fix, 16000)).toBeNull();
  expect(sectionRoadEvidence({ ...evidence, expiresAt: 9999 }, fix, 10000)).toBeNull();
  expect(sectionRoadEvidence({ ...evidence, segments: [section, { ...section, speedLimit: { value: 50, unit: 'km/h' } }] }, fix, 10000)).toBeNull();
});
