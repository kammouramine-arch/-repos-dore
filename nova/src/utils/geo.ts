import type { Coordinates } from '@/core/domain/entities/geo';

/** IUGG mean Earth radius, in metres. */
const EARTH_RADIUS_METERS = 6_371_008.8;

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/** Great-circle distance between two coordinates, in metres. */
export const distanceBetween = (from: Coordinates, to: Coordinates): number => {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLon / 2) ** 2 * Math.cos(fromLat) * Math.cos(toLat);

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Initial bearing from `from` to `to`, normalised to [0, 360). */
export const bearingBetween = (from: Coordinates, to: Coordinates): number => {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

/**
 * Local equirectangular projection around `origin`, in metres.
 * Accurate to well under a metre at the scales navigation cares about, and far
 * cheaper than a proper projection when snapping to a polyline every second.
 */
const project = (point: Coordinates, origin: Coordinates) => ({
  x:
    toRadians(point.longitude - origin.longitude) *
    Math.cos(toRadians(origin.latitude)) *
    EARTH_RADIUS_METERS,
  y: toRadians(point.latitude - origin.latitude) * EARTH_RADIUS_METERS,
});

export interface ProjectionOnSegment {
  /** Closest point on the segment. */
  point: Coordinates;
  /** Distance from the source point to `point`, in metres. */
  distance: number;
  /** Normalised position along the segment, 0 = start, 1 = end. */
  t: number;
}

/** Orthogonal projection of `point` onto the segment `[start, end]`. */
export const projectOnSegment = (
  point: Coordinates,
  start: Coordinates,
  end: Coordinates,
): ProjectionOnSegment => {
  const p = project(point, start);
  const e = project(end, start);
  const lengthSquared = e.x ** 2 + e.y ** 2;

  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, (p.x * e.x + p.y * e.y) / lengthSquared));

  const closest: Coordinates = {
    latitude: start.latitude + (end.latitude - start.latitude) * t,
    longitude: start.longitude + (end.longitude - start.longitude) * t,
  };

  return { point: closest, distance: distanceBetween(point, closest), t };
};

export interface ProjectionOnPath extends ProjectionOnSegment {
  /** Index of the segment the point snapped to (segment `i` spans `i` → `i + 1`). */
  segmentIndex: number;
}

/**
 * Snaps `point` to the closest position on a polyline, scanning only the
 * segments in `[searchFrom, searchTo]`.
 *
 * Both bounds matter during navigation. `searchFrom` skips road already
 * driven, which stops a fix snapping backwards onto a route that loops near
 * itself. `searchTo` is what keeps the cost constant: without it every fix
 * walks the entire remaining geometry, so a 500 km trip pays tens of thousands
 * of projections per second regardless of how far the car actually moved.
 */
export const projectOnPath = (
  point: Coordinates,
  path: readonly Coordinates[],
  searchFrom = 0,
  searchTo = path.length - 2,
): ProjectionOnPath | null => {
  if (path.length === 0) return null;
  if (path.length === 1) {
    return {
      point: path[0],
      distance: distanceBetween(point, path[0]),
      t: 0,
      segmentIndex: 0,
    };
  }

  const lastSegment = path.length - 2;
  const start = Math.min(Math.max(0, searchFrom), lastSegment);
  const end = Math.min(Math.max(start, searchTo), lastSegment);
  let best: ProjectionOnPath | null = null;

  for (let index = start; index <= end; index += 1) {
    const projection = projectOnSegment(point, path[index], path[index + 1]);
    if (!best || projection.distance < best.distance) {
      best = { ...projection, segmentIndex: index };
    }
  }

  return best;
};

/**
 * Index of the last vertex no further along than `target` metres.
 * Binary search, because the caller runs it on every location fix.
 */
export const vertexAtDistance = (
  cumulative: readonly number[],
  target: number,
  from = 0,
): number => {
  let low = Math.max(0, from);
  let high = cumulative.length - 1;

  if (low >= high) return high;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (cumulative[middle] <= target) low = middle;
    else high = middle - 1;
  }

  return low;
};

/** Distance from the polyline start to each of its vertices, in metres. */
export const cumulativeDistances = (path: readonly Coordinates[]): number[] => {
  const distances = new Array<number>(path.length);
  let total = 0;
  distances[0] = 0;

  for (let index = 1; index < path.length; index += 1) {
    total += distanceBetween(path[index - 1], path[index]);
    distances[index] = total;
  }

  return distances;
};
