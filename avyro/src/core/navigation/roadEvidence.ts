import type { UserPosition } from '@/core/domain/entities/geo';
import type { RoadEvidence } from '@/core/domain/ports/roadDataProvider';
import { bearingBetween, cumulativeDistances, distanceBetween, projectOnPath } from '@/utils/geo';
import { ROAD_DATA } from '@/config';

const usableFix = (position: UserPosition | null, now: number): position is UserPosition =>
  !!position && position.accuracy !== null && Number.isFinite(position.accuracy) && position.accuracy >= 0 &&
  position.accuracy <= ROAD_DATA.maxAccuracyMeters && position.timestamp <= now && now - position.timestamp <= ROAD_DATA.evidenceTtlMs;

/**
 * How much of the matched element lies ahead of where it was matched.
 *
 * TomTom's documentation does not say whether Snap to Roads returns a whole
 * road element or only the part the trace covered. Geometry that stops where
 * the car was matched says nothing about the road ahead, so it is only used
 * when it demonstrably reaches beyond the car.
 */
export function segmentAheadMeters(evidence: RoadEvidence): number {
  const geometry = evidence.segment?.geometry;
  if (!geometry || geometry.length < 2) return 0;
  const at = projectOnPath(evidence.position.coordinates, geometry);
  if (!at || at.distance > ROAD_DATA.segmentMatchMeters) return 0;
  const along = cumulativeDistances(geometry);
  const from = along[at.segmentIndex] + (along[at.segmentIndex + 1] - along[at.segmentIndex]) * at.t;
  return along[along.length - 1] - from;
}

/**
 * Whether the car is still on the matched road element.
 *
 * A TomTom road element carries one speed limit, so its geometry is exactly
 * where that limit holds. The limit stays on screen while a fresh, accurate
 * fix lies on the element and travels along it; it clears the moment the car
 * leaves either end, turns off, or the fix degrades. This replaces the
 * 5-second / 15-metre point lifetime that blanked a known limit for ten
 * seconds out of every twelve (EJXG3453, KZKG2026: "Limite —" on streets
 * where the posted 30 never changed).
 */
export function isOnMatchedSegment(evidence: RoadEvidence, position: UserPosition, now: number): boolean {
  const geometry = evidence.segment?.geometry;
  if (!geometry || geometry.length < 2 || segmentAheadMeters(evidence) < ROAD_DATA.segmentMinAheadMeters) return false;
  if (evidence.capturedAt > now || now - evidence.capturedAt > ROAD_DATA.segmentMaxAgeMs) return false;
  const at = projectOnPath(position.coordinates, geometry);
  if (!at || at.distance > ROAD_DATA.segmentMatchMeters) return false;
  // Projected onto an endpoint: the car has run off the element (a junction).
  const lastSegment = geometry.length - 2;
  if ((at.segmentIndex === 0 && at.t <= 0.001) || (at.segmentIndex === lastSegment && at.t >= 0.999)) return false;
  const moving = (position.speed ?? 0) >= 1.5 && position.heading != null && position.heading >= 0;
  if (moving) {
    const along = bearingBetween(geometry[at.segmentIndex], geometry[at.segmentIndex + 1]);
    if (Math.abs(((position.heading! - along + 540) % 360) - 180) > 35) return false;
  }
  return true;
}

/** Expiry and movement invalidate map evidence; a route match is not a guarantee. */
export function isRoadEvidenceCurrent(evidence: RoadEvidence | null, position: UserPosition | null, now: number): boolean {
  if (!evidence || !usableFix(position, now)) return false;
  if (evidence.segment && isOnMatchedSegment(evidence, position, now)) return true;
  // Point evidence: valid only briefly and only very near where it was taken.
  if ((evidence.position.speed ?? 0) >= 1.5 && (position.speed ?? 0) >= 1.5 && evidence.position.heading != null && position.heading != null) {
    const turn = Math.abs(((position.heading - evidence.position.heading + 540) % 360) - 180);
    if (turn > 35) return false;
  }
  return evidence.capturedAt <= now && now <= evidence.expiresAt && now - evidence.capturedAt <= ROAD_DATA.evidenceTtlMs && distanceBetween(evidence.position.coordinates, position.coordinates) <= ROAD_DATA.maxEvidenceMovementMeters;
}
