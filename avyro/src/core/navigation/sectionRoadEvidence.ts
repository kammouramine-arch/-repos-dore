import type { RoadAheadEvidence, RoadEvidence } from '@/core/domain/ports/roadDataProvider';
import type { UserPosition } from '@/core/domain/entities/geo';
import { bearingBetween, projectOnPath } from '@/utils/geo';

/** Reuse mapped sections only while fresh GPS physically matches their geometry. */
export function sectionRoadEvidence(data: RoadAheadEvidence | null, fix: UserPosition | null, now: number): RoadEvidence | null {
  if (!data || data.expiresAt <= now || !fix || fix.timestamp > now + 1000 || now - fix.timestamp > 5000 || fix.accuracy == null || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 12) return null;
  const matches = (data.segments ?? []).flatMap(section => {
    const at = projectOnPath(fix.coordinates, section.geometry);
    if (!at || at.distance > 12) return [];
    const a = section.geometry[at.segmentIndex], b = section.geometry[at.segmentIndex + 1];
    if (!a || !b) return [];
    const heading = bearingBetween(a, b);
    if ((fix.speed ?? 0) >= 1.5 && fix.heading != null && fix.heading >= 0 && Math.abs(((fix.heading - heading + 540) % 360) - 180) > 35) return [];
    // Do not hold a prior segment's value beyond its endpoint at a junction.
    if ((at.t < .001 && at.segmentIndex === 0) || (at.t > .999 && at.segmentIndex === section.geometry.length - 2)) return [];
    return [{ section, distance: at.distance }];
  }).sort((a, b) => a.distance - b.distance);
  const best = matches[0];
  if (!best || matches.some(other => other.distance <= best.distance + 4 && (other.section.speedLimit.value !== best.section.speedLimit.value || other.section.speedLimit.unit !== best.section.speedLimit.unit))) return null;
  return { source: 'TomTom map data', capturedAt: fix.timestamp, expiresAt: Math.min(data.expiresAt, fix.timestamp + 5000), speedLimit: best.section.speedLimit, position: fix, recentSegmentSigns: [] };
}
