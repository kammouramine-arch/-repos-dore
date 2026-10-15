import type { Coordinates } from '@/core/domain/entities/geo';
import { toDegrees, toRadians } from '@/utils/geo';

/** Clockwise from screen-up, using MapKit's actual tilted-map projection. */
export function projectedPuckBearing(from: { x: number; y: number }, to: { x: number; y: number }): number | null {
  const dx = to.x - from.x, dy = to.y - from.y;
  return Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) >= 2 ? (toDegrees(Math.atan2(dx, -dy)) + 360) % 360 : null;
}

/** A short forward tangent; this is orientation geometry, never a route guess. */
export function puckBearingPoint(from: Coordinates, heading: number): Coordinates {
  const lat = toRadians(from.latitude), lon = toRadians(from.longitude), angle = toRadians(heading), arc = 15 / 6371008.8;
  const nextLat = Math.asin(Math.sin(lat) * Math.cos(arc) + Math.cos(lat) * Math.sin(arc) * Math.cos(angle));
  const nextLon = lon + Math.atan2(Math.sin(angle) * Math.sin(arc) * Math.cos(lat), Math.cos(arc) - Math.sin(lat) * Math.sin(nextLat));
  return { latitude: toDegrees(nextLat), longitude: (toDegrees(nextLon) + 540) % 360 - 180 };
}
