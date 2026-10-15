import type { RoadAlert, RoadEvidence } from '@/core/domain/ports/roadDataProvider';

/**
 * No approach-validated sign feed is configured. A planned polyline passed to
 * Snap to Roads is neither evidence of where this vehicle drove nor proof that
 * a sign applies to its approach. Do not spend quota or surface cached alerts.
 * Current-road limits are resolved separately from measured GPS traces.
 */
export function useRoadAhead(): {
  items: { alert: RoadAlert; aheadMeters: number }[];
  current: RoadEvidence | null;
} {
  return { items: [], current: null };
}
