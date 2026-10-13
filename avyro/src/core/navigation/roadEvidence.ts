import type { UserPosition } from '@/core/domain/entities/geo';
import type { RoadEvidence } from '@/core/domain/ports/roadDataProvider';
import { distanceBetween } from '@/utils/geo';
import { ROAD_DATA } from '@/config';

/** Expiry and movement invalidate map evidence; a route match is not a guarantee. */
export function isRoadEvidenceCurrent(evidence: RoadEvidence | null, position: UserPosition | null, now: number): boolean {
  return !!(evidence && position && position.accuracy !== null && Number.isFinite(position.accuracy) && position.accuracy >= 0 && position.accuracy <= ROAD_DATA.maxAccuracyMeters && position.timestamp <= now && now - position.timestamp <= ROAD_DATA.evidenceTtlMs && evidence.capturedAt <= now && now <= evidence.expiresAt && now - evidence.capturedAt <= ROAD_DATA.evidenceTtlMs && distanceBetween(evidence.position.coordinates, position.coordinates) <= ROAD_DATA.maxEvidenceMovementMeters);
}
