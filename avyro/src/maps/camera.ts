import { MAP_DEFAULTS } from '@/config';
import type { Coordinates, MapRegion } from '@/core/domain/entities/geo';

/**
 * Viewport centred on a point, at the app's standard "locked on" zoom.
 *
 * Fitting a whole route is left to `MapView.fitToCoordinates`, which is the
 * only thing that can honour the edge padding the floating cards need.
 */
export const regionAround = (
  center: Coordinates,
  delta: number = MAP_DEFAULTS.zoomedInDelta,
): MapRegion => ({
  ...center,
  latitudeDelta: delta,
  longitudeDelta: delta,
});
