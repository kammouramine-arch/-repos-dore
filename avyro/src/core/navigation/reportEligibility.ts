import type { UserPosition } from '../domain/entities/geo';

/** A usable location is required to place an observation, not a GPS speed reading. */
export const canReportIncident = (fix: UserPosition | null, now: number): boolean =>
  !!fix && fix.timestamp <= now + 1000 && now - fix.timestamp <= 60000 &&
  Number.isFinite(fix.coordinates.latitude) && Math.abs(fix.coordinates.latitude) <= 90 &&
  Number.isFinite(fix.coordinates.longitude) && Math.abs(fix.coordinates.longitude) <= 180 &&
  fix.accuracy !== null && Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 100;
