import type { UserPosition } from '../domain/entities/geo';

/** A fresh stationary fix is required before opening any report interaction. */
export const canReportIncident = (fix: UserPosition | null, now: number): boolean =>
  !!fix && now >= fix.timestamp && now - fix.timestamp <= 10000 &&
  fix.speed !== null && fix.speed >= 0 && fix.speed < 0.5 &&
  fix.accuracy !== null && fix.accuracy >= 0 && fix.accuracy <= 30;
