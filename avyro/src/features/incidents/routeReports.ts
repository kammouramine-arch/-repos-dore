import { bearingBetween } from '@/utils/geo';
import type { ReviewedIncident } from '@/core/domain/ports/incidentReporter';
import type { RouteIndex } from '@/core/navigation/routeIndex';
import { locateOnRoute } from '@/core/conversation/detour';

/** Proximity is not proof that a report affects this carriageway. */
export function reportsNearRoute(reports: readonly ReviewedIncident[], route: RouteIndex, drivenMeters: number, now: number) {
  return reports.filter(report => report.expires > now).flatMap(report => {
    const at = locateOnRoute(route, { latitude: report.latitude, longitude: report.longitude });
    if (at && report.heading != null && Number.isFinite(report.heading)) {
      const path = route.route.geometry;
      const bearing = bearingBetween(path[at.segmentIndex], path[at.segmentIndex + 1]);
      if (Math.abs(((bearing - report.heading + 540) % 360) - 180) > 45) return [];
    }
    return at && at.lateralMeters <= 75 && at.travelledMeters >= drivenMeters - 25 ? [{ report, aheadMeters: Math.max(0, at.travelledMeters - drivenMeters) }] : [];
  }).sort((a, b) => a.aheadMeters - b.aheadMeters);
}
